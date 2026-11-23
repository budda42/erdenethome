// Facebook → ERDENET HOME sync, browser part.
// Run inside the Claude built-in browser on https://www.facebook.com/profile.php?id=61593044292253
// while signed in to Facebook. Paste this whole file once (javascript_exec), then:
//
//   await __ehScan(15)   → captures the newest posts (repeat until {done:true}; ≤ 30 s per call)
//   __ehMeta()           → JSON string of every captured post (text, ids, photo count), padded so the
//                          tool result is saved to a file → feed it to `merge.py plan`
//   __ehQueue(keys)      → queues the photos of the posts `merge.py plan` reported as new
//   await __ehNext()     → JSON string with the next ~240 KB of photos; repeat until cur === total
//
// New posts are always at the top of the profile, so a daily run only needs the first screens.
// Ids: `pid` is the numeric post id from photo links ("pcb.<id>") and is stable; the "pfbid…"
// story id changes between sessions, so it is only used as a key within one run.
(function () {
  "use strict";
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.__eh = window.__eh || {};

  async function expand() {
    var btns = Array.prototype.filter.call(document.querySelectorAll('div[aria-posinset] div[role="button"]'), function (e) {
      return /^(See more|Цааш үзэх|Цааш нь)$/.test(e.textContent.trim());
    });
    for (var i = 0; i < btns.length; i++) { try { btns[i].click(); } catch (e) { /* ignore */ } await sleep(120); }
  }

  async function collect() {
    await expand();
    document.querySelectorAll("div[aria-posinset]").forEach(function (p) {
      var hrefs = Array.prototype.map.call(p.querySelectorAll("a[href]"), function (a) { return a.href; });
      var story = hrefs.find(function (h) { return /story_fbid=|\/posts\/|pfbid/.test(h); });
      var pcb = hrefs.map(function (h) { return (h.match(/pcb\.(\d+)/) || [])[1]; }).find(Boolean) || null;
      var sid = null;
      if (story) { try { sid = new URL(story).searchParams.get("story_fbid") || (story.match(/pfbid\w+/) || [])[0]; } catch (e) { /* ignore */ } }
      var k = pcb || sid;
      if (!k) return;
      var msg = p.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]');
      var text = msg ? msg.innerText : "";
      if (!text) {
        text = Array.prototype.map.call(p.querySelectorAll('div[dir="auto"]'), function (d) { return d.innerText; })
          .filter(function (t) { return t.length > 8; }).sort(function (a, b) { return b.length - a.length; })[0] || "";
      }
      var imgs = Array.prototype.filter.call(p.querySelectorAll("img"), function (i) {
        return /scontent|fbcdn/.test(i.src) && (i.naturalWidth >= 200 || i.width >= 150);
      }).map(function (i) { return i.src; });
      var prev = window.__eh[k] || {};
      window.__eh[k] = {
        k: k, pid: pcb || prev.pid || null,
        text: text.length > (prev.text || "").length ? text : prev.text || "",
        imgs: Array.from(new Set((prev.imgs || []).concat(imgs))),
        link: sid ? "https://www.facebook.com/permalink.php?story_fbid=" + encodeURIComponent(sid) + "&id=61593044292253" : prev.link || "",
        order: prev.order != null ? prev.order : Object.keys(window.__eh).length,
      };
    });
  }

  window.__ehScan = async function (maxPosts) {
    maxPosts = maxPosts || 15;
    var t0 = Date.now(), still = 0;
    while (!document.querySelector("div[aria-posinset]") && Date.now() - t0 < 15000) await sleep(500);
    while (Date.now() - t0 < 30000) {
      var before = Object.keys(window.__eh).length;
      await collect();
      if (Object.keys(window.__eh).length >= maxPosts) return { done: true, posts: Object.keys(window.__eh).length };
      var ps = document.querySelectorAll("div[aria-posinset]");
      if (ps.length) ps[ps.length - 1].scrollIntoView({ block: "end" });
      window.scrollBy(0, 600);
      await sleep(1800);
      still = Object.keys(window.__eh).length === before ? still + 1 : 0;
      // Facebook stopped loading more ("This is taking longer than expected") or the feed ended.
      if (still >= 6) return { done: true, posts: Object.keys(window.__eh).length, end: true };
    }
    return { done: false, posts: Object.keys(window.__eh).length };
  };

  window.__ehMeta = function () {
    var meta = Object.values(window.__eh).sort(function (a, b) { return a.order - b.order; }).map(function (p) {
      return { k: p.k, pid: p.pid, text: p.text, link: p.link, n: Math.min(p.imgs.length, 8) };
    });
    return JSON.stringify({ meta: meta }) + " ".repeat(120000);
  };

  window.__ehQueue = function (keys) {
    window.__q = [];
    (keys || []).forEach(function (k) {
      var p = window.__eh[k];
      if (p) p.imgs.slice(0, 8).forEach(function (u, n) { window.__q.push({ k: k, n: n, u: u }); });
    });
    window.__cur = 0;
    return { photos: window.__q.length };
  };

  async function enc(u) {
    var b = await (await fetch(u, { mode: "cors", credentials: "omit" })).blob();
    var bm = await createImageBitmap(b);
    var s = Math.min(1, 640 / Math.max(bm.width, bm.height));
    var c = new OffscreenCanvas(Math.round(bm.width * s), Math.round(bm.height * s));
    c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
    var out = await c.convertToBlob({ type: "image/jpeg", quality: 0.68 });
    return await new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result.split(",")[1]); }; fr.readAsDataURL(out); });
  }

  window.__ehNext = async function (limit) {
    limit = limit || 240000;
    var out = [], size = 0, t0 = Date.now();
    while (window.__cur < window.__q.length && Date.now() - t0 < 30000) {
      var it = window.__q[window.__cur], b = "";
      try { b = await enc(it.u); } catch (e) { b = ""; }
      if (size + b.length > limit && out.length) break;
      out.push({ k: it.k, n: it.n, b: b }); size += b.length; window.__cur++;
    }
    return JSON.stringify({ cur: window.__cur, total: window.__q.length, out: out });
  };

  return "fb-sync collector ready";
})();
