// Facebook → ERDENET HOME sync, browser part.
// Run inside the Claude built-in browser on https://www.facebook.com/profile.php?id=61593044292253
// while signed in to Facebook. Paste this whole file once (javascript_exec), then call:
//
//   await __ehScan()              → scrolls the profile and collects posts (may need several calls;
//                                   returns {done:false} until the end of the feed or `maxScreens`)
//   __ehNew(knownIds)             → keeps only posts whose story id is not in knownIds; returns a
//                                   summary and queues their photos
//   __ehMeta()                    → JSON string of the new posts' texts and links (padded so the tool
//                                   result is saved to a file instead of shown inline)
//   await __ehNext()              → JSON string with the next ~240 KB of photos (base64 JPEG);
//                                   repeat until cur === total
//
// Facebook unmounts posts that scroll off screen, so posts are captured while scrolling.
(function () {
  "use strict";
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.__eh = window.__eh || {};

  function storyId(href) {
    try {
      var u = new URL(href);
      return u.searchParams.get("story_fbid") || (href.match(/pfbid\w+/) || [])[0] || (href.match(/\/posts\/(\d+)/) || [])[1] || null;
    } catch (e) { return null; }
  }

  async function expand() {
    var btns = Array.prototype.filter.call(document.querySelectorAll('div[aria-posinset] div[role="button"]'), function (e) {
      return /^(See more|Цааш үзэх|Цааш нь)$/.test(e.textContent.trim());
    });
    for (var i = 0; i < btns.length; i++) { try { btns[i].click(); } catch (e) { /* ignore */ } await sleep(150); }
  }

  async function collect() {
    await expand();
    document.querySelectorAll("div[aria-posinset]").forEach(function (p) {
      var link = Array.prototype.map.call(p.querySelectorAll("a[href]"), function (a) { return a.href; })
        .find(function (h) { return /story_fbid|\/posts\/|pfbid/.test(h); });
      var k = link && storyId(link);
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
        k: k,
        text: text.length > (prev.text || "").length ? text : prev.text || "",
        imgs: Array.from(new Set((prev.imgs || []).concat(imgs))),
        link: "https://www.facebook.com/permalink.php?story_fbid=" + encodeURIComponent(k) + "&id=61593044292253",
        order: prev.order != null ? prev.order : Object.keys(window.__eh).length,
      };
    });
  }

  // Scroll the profile in 700px steps for up to ~35 s per call (tool calls time out at 45 s).
  window.__ehScan = async function (maxScreens) {
    maxScreens = maxScreens || 80;
    window.__ehY = window.__ehY || 0;
    window.__ehStuck = window.__ehStuck || 0;
    var t0 = Date.now();
    while (Date.now() - t0 < 35000) {
      await collect();
      window.__ehY += 700;
      window.scrollTo(0, window.__ehY);
      await sleep(900);
      var h = document.documentElement.scrollHeight;
      if (window.__ehY >= h - window.innerHeight) {
        await sleep(1500);
        if (document.documentElement.scrollHeight === h) window.__ehStuck++; else window.__ehStuck = 0;
      }
      if (window.__ehStuck >= 4 || window.__ehY / 700 >= maxScreens) {
        await collect();
        return { done: true, posts: Object.keys(window.__eh).length };
      }
    }
    return { done: false, posts: Object.keys(window.__eh).length };
  };

  window.__ehNew = function (knownIds) {
    var known = new Set(knownIds || []);
    window.__ehFresh = Object.values(window.__eh)
      .filter(function (p) { return !known.has(p.k) && p.text && p.text.replace(/\s|9952-8028/g, "").length > 15; })
      .sort(function (a, b) { return a.order - b.order; });
    window.__q = [];
    window.__ehFresh.forEach(function (p) { p.imgs.slice(0, 8).forEach(function (u, n) { window.__q.push({ k: p.k, n: n, u: u }); }); });
    window.__cur = 0;
    return {
      scanned: Object.keys(window.__eh).length, fresh: window.__ehFresh.length, photos: window.__q.length,
      heads: window.__ehFresh.map(function (p) { return p.text.split("\n")[0].slice(0, 60); }),
    };
  };

  window.__ehMeta = function () {
    var meta = window.__ehFresh.map(function (p) { return { k: p.k, text: p.text, link: p.link, n: Math.min(p.imgs.length, 8) }; });
    return JSON.stringify({ meta: meta }) + " ".repeat(120000);
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
    var out = [], size = 0;
    while (window.__cur < window.__q.length) {
      var it = window.__q[window.__cur], b = "";
      try { b = await enc(it.u); } catch (e) { b = ""; }
      if (size + b.length > limit && out.length) break;
      out.push({ k: it.k, n: it.n, b: b }); size += b.length; window.__cur++;
    }
    return JSON.stringify({ cur: window.__cur, total: window.__q.length, out: out });
  };

  return "fb-sync collector ready";
})();
