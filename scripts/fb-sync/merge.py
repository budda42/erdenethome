#!/usr/bin/env python3
"""Facebook → ERDENET HOME sync, repository part.

  python3 scripts/fb-sync/merge.py known
      Prints the story ids already in data/fb-listings.json as a JSON array
      (pass it to __ehNew() in the browser).

  python3 scripts/fb-sync/merge.py add RESULT_FILE [RESULT_FILE ...]
      Reads the saved browser tool results (the __ehMeta() file and every __ehNext() file),
      adds the new posts to data/fb-listings.json (newest first) with their photos in
      site/img/fb/<id>/, rebuilds site/data/listings.json and prints what was added.
      Re-running with the same files adds nothing twice.

Result files are what the tool harness saved: a JSON array [{type, text}] whose text is the
JSON string returned by the browser (optionally followed by a "(captured at origin …)" note).
"""
import base64, hashlib, json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(ROOT, "data", "fb-listings.json")
IMG = os.path.join(ROOT, "site", "img", "fb")
PHONE = "9952-8028"


def story_id(link):
    m = re.search(r"story_fbid=([^&]+)", link or "")
    return m.group(1) if m else None


def load_result(path):
    raw = json.load(open(path, encoding="utf-8"))
    text = raw[0]["text"] if isinstance(raw, list) else raw
    if "[truncated" in text:
        raise SystemExit(f"{path}: the tool result was truncated — call __ehNext with a smaller limit")
    text = text.split("\n\n(captured at origin")[0]
    val = json.loads(text)
    return json.loads(val.rstrip()) if isinstance(val, str) else val


# ---------- text → fields ----------
def clean(t):
    t = re.sub(r"\s*(Хураах|See less)\s*$", "", t.strip())
    out = []
    for line in t.split("\n"):
        line = re.sub(r"[ \t]+", " ", line).strip(" |")
        if not line or re.fullmatch(r"[\d\-\.\s|]*" + PHONE + r"[\.\s|]*", line):
            continue
        if out and out[-1] == line:
            continue
        out.append(line)
    return "\n".join(out)


def num(s):
    return float(s.replace(",", "."))


def parse(text):
    t = clean(text)
    up = t.upper()
    first = t.split("\n")[0]
    # Rooms: "#3өрөө" hashtag first, then "2 өрөөг 3 өрөө болгосон" → 3, then the first "N өрөө".
    # Lines about barter ("1-2 өрөө ... сонирхоно") and counts above 6 (rooms of a building) are ignored.
    body = "\n".join(l for l in t.split("\n") if not re.search(r"сонирхоно|бартер", l, re.I))
    rooms = (re.search(r"#(\d)\s*өрөө", body, re.I)
             or re.search(r"\d\s*өрөөг\s*(\d)\s*өрөө", body, re.I)
             or next((m for m in re.finditer(r"(?<!\d)(\d{1,2})\s*-?\s*өрөө", body, re.I) if 1 <= int(m.group(1)) <= 6), None))
    area = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:мкв|м²|м2|мкв\.)", t, re.I)
    land = re.search(r"(\d+(?:[.,]\d+)?)\s*(га|мкв|м²)\s*газар", t, re.I)
    floor = re.search(r"(\d+\s*/\s*\d+|B\d|\d+)\s*давхар(?:т|т\b)?", t, re.I)
    # Price: after "Үнэ" when present; otherwise the first amount not right after a size
    # (skips e.g. a garage "18мкв 50саяд").
    price_re = r"(\d+(?:[.,]\d+)?)\s*(тэрбум|сая)(аас|ас|д|аар)?"
    une = re.search(r"Үнэ", t)
    price = re.search(price_re, t[une.end():], re.I) if une else None
    if not price:
        price = next((m for m in re.finditer(price_re, t, re.I)
                      if not re.search(r"мкв|м²|граш|гараж", t[max(0, m.start() - 25):m.start()], re.I)), None)

    if re.search(r"ОБЪЕКТ|ҮЙЛЧИЛГЭЭНИЙ|ОФФИС|АГУУЛАХ", up):
        cat = "object"
    elif re.search(r"ТҮРЭЭС", up):
        cat = "rent"
    elif re.search(r"#?БАЙШИН|ХАШАА|ДҮНЗЭН", up):
        cat = "house"
    elif re.search(r"#ГАЗАР|ГАЗАР ХУДАЛДАНА", up) and not rooms:
        cat = "land"
    else:
        cat = "apartment"

    value = None
    ptext = None
    if price:
        value = int(num(price.group(1)) * (1e9 if price.group(2).lower() == "тэрбум" else 1e6))
        if price.group(3) and price.group(3).lower() in ("аас", "ас"):
            ptext = f"{price.group(1)} {price.group(2).lower()} ₮-өөс"
        if value < 20_000_000 and cat != "rent":  # e.g. "3.3саяаас" = per m²
            ptext, value = f"м² {price.group(1)} сая ₮-өөс", None

    if cat in ("object", "land"):
        rooms = None
    # Title: the first line without hashtags, tidied up.
    title = re.sub(r"#\S+", "", first).strip(" !.-")
    title = re.sub(r"\s+", " ", title)
    if title.isupper():
        title = title.capitalize()
    if rooms and "өрөө" not in title.lower():
        title += f" {rooms.group(1)} өрөө"
    land_m2 = None
    if land:
        land_m2 = num(land.group(1)) * (10000 if land.group(2).lower() == "га" else 1)
    return {
        "category": cat,
        "title": title[:80] or "Шинэ зар",
        "rooms": int(rooms.group(1)) if rooms else None,
        "areaM2": num(area.group(1)) if area and not (land and area.start() == land.start()) else None,
        "landM2": int(land_m2) if land_m2 else None,
        "floor": re.sub(r"\s", "", floor.group(1)) if floor else None,
        "price": value,
        "priceText": ptext,
        "description": t,
        "sold": bool(re.search(r"ЗАРАГДСАН|ЗАРАГДЛАА|SOLD", up)),
    }


# ---------- commands ----------
def known():
    d = json.load(open(DATA, encoding="utf-8"))
    print(json.dumps([story_id(l.get("source")) for l in d["listings"] if story_id(l.get("source"))]))


def add(paths):
    meta, photos = [], {}
    for p in paths:
        r = load_result(p)
        if "meta" in r:
            meta += r["meta"]
        for it in r.get("out", []):
            if it.get("b"):
                photos[(it["k"], it["n"])] = it["b"]
    d = json.load(open(DATA, encoding="utf-8"))
    have = {story_id(l.get("source")) for l in d["listings"]}
    have_text = {re.sub(r"\W", "", l.get("description", ""))[:80] for l in d["listings"]}
    added, skipped = [], []
    for m in meta:
        f = parse(m["text"])
        sig = re.sub(r"\W", "", f["description"])[:80]
        if m["k"] in have or sig in have_text:
            continue
        if f.pop("sold"):
            skipped.append(f["title"] + " (зарагдсан)")
            continue
        lid = "fb-" + hashlib.sha1(m["k"].encode()).hexdigest()[:8]
        imgs = []
        for n in range(m.get("n", 0)):
            b = photos.get((m["k"], n))
            if not b:
                continue
            os.makedirs(os.path.join(IMG, lid), exist_ok=True)
            open(os.path.join(IMG, lid, f"{len(imgs) + 1}.jpg"), "wb").write(base64.b64decode(b))
            imgs.append(f"img/fb/{lid}/{len(imgs) + 1}.jpg")
        added.append({"id": lid, **{k: f[k] for k in ("category", "title")}, "location": None,
                      **{k: f[k] for k in ("rooms", "areaM2", "landM2", "floor", "price", "priceText")},
                      "phone": PHONE, "description": f["description"], "images": imgs, "source": m["link"],
                      "latitude": None, "longitude": None})
        have.add(m["k"]); have_text.add(sig)
    if added:
        d["listings"] = added + d["listings"]  # newest first, like the Facebook feed
        json.dump(d, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        subprocess.run(["node", "scripts/build-pages-data.mjs"], cwd=ROOT, check=True)
    print(json.dumps({"added": len(added), "skipped": skipped,
                      "new": [{"id": a["id"], "category": a["category"], "title": a["title"], "photos": len(a["images"]),
                               "price": a["price"] or a["priceText"]} for a in added]}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "known":
        known()
    elif len(sys.argv) >= 3 and sys.argv[1] == "add":
        add(sys.argv[2:])
    else:
        print(__doc__)
        sys.exit(2)
