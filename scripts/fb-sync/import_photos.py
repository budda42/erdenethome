#!/usr/bin/env python3
"""Replace ad photos with full-size originals from a photo ZIP made in the browser.

  python3 scripts/fb-sync/import_photos.py bairder-photos.zip [--max 15]

The ZIP holds meta.json ({"meta": [{pcb, text, photos: [{file, w, h}]}]}) and <pcb>/<n>.jpg files,
collected from the Facebook photo viewer (see README). Each post is matched to an ad in
data/fb-listings.json by its post id (fbPostId) or its text; the ad's photos in site/img/fb/<id>/
are replaced and the ad gets fbPostId so later syncs match it by id. Unmatched posts are listed.
"""
import json, os, re, shutil, subprocess, sys, zipfile

sys.path.insert(0, os.path.dirname(__file__))
import merge  # noqa: E402

ROOT = merge.ROOT
DATA = merge.DATA
IMG = merge.IMG


def first_line(t):
    return re.sub(r"\W", "", merge.clean(t).split("\n")[0]).lower()


def main(path, limit):
    z = zipfile.ZipFile(path)
    meta = json.loads(z.read("meta.json"))["meta"]
    d = json.load(open(DATA, encoding="utf-8"))
    L = d["listings"]
    by_pid = {l.get("fbPostId"): l for l in L if l.get("fbPostId")}
    by_sig = {re.sub(r"\W", "", l["description"])[:80]: l for l in L}
    by_first = {}
    for l in L:
        by_first.setdefault(first_line(l["description"]), []).append(l)

    done, unmatched, used = [], [], set()
    for m in meta:
        if not m["photos"]:
            continue
        l = by_pid.get(m["pcb"]) or by_sig.get(merge.sig(m["text"]))
        if not l:
            cands = [c for c in by_first.get(first_line(m["text"]), []) if c["id"] not in used]
            l = cands[0] if len(cands) == 1 else None
        if not l or l["id"] in used:
            unmatched.append(merge.clean(m["text"]).split("\n")[0][:60] or m["pcb"])
            continue
        used.add(l["id"])
        folder = os.path.join(IMG, l["id"])
        shutil.rmtree(folder, ignore_errors=True)
        os.makedirs(folder)
        imgs = []
        for n, ph in enumerate(m["photos"][:limit], 1):
            with open(os.path.join(folder, f"{n}.jpg"), "wb") as f:
                f.write(z.read(ph["file"]))
            imgs.append(f"img/fb/{l['id']}/{n}.jpg")
        before = len(l.get("images", []))
        l["images"] = imgs
        l["fbPostId"] = m["pcb"]
        done.append((l["id"], l["title"], before, len(imgs)))

    json.dump(d, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    subprocess.run(["node", "scripts/build-pages-data.mjs"], cwd=ROOT, check=True)
    print(f"updated {len(done)} ads, photos {sum(x[2] for x in done)} → {sum(x[3] for x in done)}")
    print("ads without new photos:", [(l["id"], l["title"]) for l in L if l["id"] not in used])
    print("posts not matched to an ad:", unmatched)


if __name__ == "__main__":
    args = sys.argv[1:]
    limit = 15
    if "--max" in args:
        i = args.index("--max"); limit = int(args[i + 1]); del args[i:i + 2]
    if len(args) != 1:
        print(__doc__); sys.exit(2)
    main(args[0], limit)
