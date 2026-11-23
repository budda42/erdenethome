(function () {
  "use strict";
  var cfg = window.EH_CONFIG || {};
  var APP = (cfg.appUrl || "").replace(/\/+$/, "");
  var CENTER = [49.0333, 104.05]; // Erdenet

  var CATS = [
    { id: "", label: "Бүгд", icon: "✨" },
    { id: "apartment", label: "Орон сууц", icon: "🏢" },
    { id: "house", label: "Хашаа байшин", icon: "🏡" },
    { id: "land", label: "Газар", icon: "🌄" },
    { id: "rent", label: "Түрээс", icon: "🔑" },
    { id: "object", label: "Объект", icon: "🏬" },
  ];
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });

  var state = {
    all: [], live: false, view: "swipe", cat: "", filter: { q: "", rooms: "", max: "" },
    queue: [], pos: 0, saved: loadSaved(),
  };
  var map, layer;

  // ---------- helpers ----------
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function mnt(n) { return n == null ? null : Math.round(n).toLocaleString("en-US").replace(/,/g, " ") + " ₮"; }
  function short(n) {
    if (n == null) return "";
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + " тэрбум ₮";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + " сая ₮";
    return mnt(n);
  }
  function metaOf(i) {
    return [i.rooms ? i.rooms + " өрөө" : null, i.areaM2 ? i.areaM2 + " м²" : null,
      i.landM2 ? i.landM2 + " м² газар" : null, i.floor ? i.floor + " давхар" : null].filter(Boolean).join(" · ");
  }
  function priceOf(i) { return i.priceText || mnt(i.price) || "Үнийг залгаж асууна уу"; }
  function $(s) { return document.querySelector(s); }
  function tel(p) { return "tel:" + String(p || "").replace(/[^\d+]/g, ""); }
  function phoneOf(i) { return (i && i.phone) || cfg.phone; }
  function loadSaved() { try { return JSON.parse(localStorage.getItem("eh_saved") || "[]"); } catch (e) { return []; } }
  function storeSaved() { try { localStorage.setItem("eh_saved", JSON.stringify(state.saved)); } catch (e) { /* private mode */ } }
  function isSaved(id) { return state.saved.indexOf(String(id)) >= 0; }

  function contactButtons(i, big) {
    var ph = phoneOf(i);
    var h = "";
    if (ph) h += '<a class="btn btn-call" href="' + esc(tel(ph)) + '">📞 ' + (big ? "Залгах " + esc(ph) : "Залгах") + "</a>";
    if (cfg.messenger) h += '<a class="btn btn-msg" target="_blank" rel="noopener noreferrer" href="' + esc(cfg.messenger) + '">💬 Messenger</a>';
    if (big && cfg.facebook) h += '<a class="btn btn-fb" target="_blank" rel="noopener noreferrer" href="' + esc(cfg.facebook) + '">Facebook хуудас</a>';
    return h;
  }

  // ---------- static wiring ----------
  $("#year").textContent = new Date().getFullYear();
  document.querySelectorAll(".js-fb").forEach(function (a) { a.href = cfg.facebook || "#"; });
  $(".js-contact").innerHTML = contactButtons(null, true) +
    (APP ? '<a class="btn btn-primary" href="' + esc(APP + "/register") + '">Бүртгүүлэх / Нэвтрэх</a>' : "");
  $(".js-contact-mini").innerHTML = contactButtons(null, false);
  $(".js-contact-big").innerHTML = contactButtons(null, true);
  // Top-right corner: the phone number itself, tapping it calls (used for posting ads).
  var topPhone = $(".js-top-phone");
  if (cfg.phone) { topPhone.href = tel(cfg.phone); topPhone.querySelector("span").textContent = cfg.phone; }
  else topPhone.hidden = true;
  var postDlg = $("#post");
  document.querySelectorAll(".js-post").forEach(function (b) { b.onclick = function () { postDlg.showModal(); }; });
  postDlg.querySelector(".close").onclick = function () { postDlg.close(); };
  postDlg.onclick = function (e) { if (e.target === postDlg) postDlg.close(); };

  // ---------- data ----------
  function categoryOf(type, deal) {
    var t = String(type || "").toLowerCase();
    if (deal === "rent") return "rent";
    if (/газар/.test(t)) return "land";
    if (/байшин|хашаа|дүнз/.test(t)) return "house";
    if (/объект|оффис|үйлчилгээ|агуулах|худалдааны/.test(t)) return "object";
    return "apartment";
  }
  function fromLive(items) {
    return items.map(function (i) {
      var img = i.coverUrl ? (/^https?:/.test(i.coverUrl) ? i.coverUrl : APP + i.coverUrl) : null;
      return {
        id: "app-" + i.id, category: categoryOf(i.propertyType, i.dealType), title: i.name,
        location: [i.district, i.address].filter(Boolean).join(", "), rooms: i.rooms, areaM2: i.areaM2,
        price: i.price, images: img ? [img] : [], latitude: i.latitude, longitude: i.longitude,
        url: APP + "/properties/" + i.id, description: "",
      };
    });
  }
  function load() {
    var local = fetch("data/listings.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { return d.listings || []; })
      .catch(function () { return []; });
    var live = APP
      ? fetch(APP + "/api/properties?pageSize=200").then(function (r) { return r.json(); })
          .then(function (j) { if (!j.ok) return []; state.live = true; return fromLive(j.data.items); })
          .catch(function () { return []; })
      : Promise.resolve([]);
    // Pin positions set on location.html (id → {lat, lng}); they override the data file.
    var locs = fetch("data/locations.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return {}; });
    return Promise.all([local, live, locs]).then(function (r) {
      var pins = r[2] || {};
      state.all = r[0].concat(r[1]).map(function (i) {
        var p = pins[i.id];
        return p && isFinite(p.lat) && isFinite(p.lng) ? Object.assign({}, i, { latitude: p.lat, longitude: p.lng }) : i;
      });
    });
  }

  // ---------- filtering ----------
  function matches(i, ignoreCat) {
    var f = state.filter, q = f.q.trim().toLowerCase();
    if (!ignoreCat && state.cat && i.category !== state.cat) return false;
    if (q && (i.title + " " + (i.location || "") + " " + (i.description || "")).toLowerCase().indexOf(q) < 0) return false;
    if (f.rooms && (f.rooms === "4" ? (i.rooms || 0) < 4 : String(i.rooms) !== f.rooms)) return false;
    if (f.max && i.price && i.price > Number(f.max)) return false;
    return true;
  }
  function filtered() { return state.all.filter(function (i) { return matches(i, false); }); }

  function renderCats() {
    $("#cats").innerHTML = CATS.map(function (c) {
      var n = state.all.filter(function (i) { return (!c.id || i.category === c.id) && matches(i, true); }).length;
      return '<button type="button" role="tab" class="chip' + (state.cat === c.id ? " on" : "") + '" data-cat="' + c.id + '">' +
        c.icon + " " + esc(c.label) + '<span class="n">' + n + "</span></button>";
    }).join("");
  }
  $("#cats").addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return;
    state.cat = b.dataset.cat; refresh(true);
    document.getElementById("listings").scrollIntoView();
  });

  function renderStats() {
    var all = state.all;
    var prices = all.map(function (i) { return i.price; }).filter(Boolean);
    $("#stats").innerHTML = all.length
      ? '<span class="stat"><b>' + all.length + "</b>идэвхтэй зар</span>" +
        (prices.length ? '<span class="stat"><b>' + esc(short(Math.min.apply(null, prices))) + "</b>-с эхэлнэ</span>" : "") +
        '<button type="button" class="stat stat-btn js-post">+ Зар оруулах</button>'
      : "";
    $("#stats .js-post") && ($("#stats .js-post").onclick = function () { postDlg.showModal(); });
  }

  // ---------- grid ----------
  function card(i) {
    var img = i.images && i.images[0];
    var meta = metaOf(i);
    return '<article class="card item" data-id="' + esc(i.id) + '" tabindex="0">' +
      '<div class="thumb' + (img ? "" : " noimg") + '">' + (img ? '<img loading="lazy" alt="" src="' + esc(img) + '">' : esc(CAT[i.category] ? CAT[i.category].icon : "🏠")) +
      '<span class="badge">' + esc(CAT[i.category] ? CAT[i.category].label : "") + "</span></div>" +
      '<div class="item-body"><h3>' + esc(i.title) + "</h3>" +
      (meta ? '<span class="item-meta">' + esc(meta) + "</span>" : "") +
      (i.location ? '<span class="item-meta">📍 ' + esc(i.location) + "</span>" : "") +
      '<span class="price">' + esc(priceOf(i)) + "</span>" +
      '<div class="item-act">' + contactButtons(i, false) + "</div>" +
      "</div></article>";
  }
  function renderGrid(el, list, empty) {
    el.innerHTML = list.length ? list.map(card).join("") : '<div class="card empty muted">' + empty + "</div>";
  }
  ["#grid", "#saved-grid"].forEach(function (s) {
    $(s).addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var el = e.target.closest(".item"); if (el) openDetail(el.dataset.id);
    });
  });

  // ---------- swipe deck ----------
  function swipeCard(i, behind) {
    var imgs = i.images || [];
    var meta = metaOf(i);
    return '<div class="swipe' + (behind ? " behind" : "") + '" data-id="' + esc(i.id) + '" data-img="0">' +
      '<div class="photo"' + (imgs[0] ? ' style="background-image:url(&quot;' + esc(imgs[0]) + '&quot;)"' : "") + ">" +
      (imgs[0] ? "" : esc(CAT[i.category] ? CAT[i.category].icon : "🏠")) +
      (imgs.length > 1 ? '<div class="bars">' + imgs.map(function (_, k) { return '<i class="' + (k ? "" : "on") + '"></i>'; }).join("") + "</div>" +
        '<button type="button" class="pnav prev" data-step="-1" aria-label="Өмнөх зураг">‹</button>' +
        '<button type="button" class="pnav next" data-step="1" aria-label="Дараагийн зураг">›</button>' +
        '<span class="counter">1 / ' + imgs.length + "</span>" : "") +
      '<span class="cat">' + esc(CAT[i.category] ? CAT[i.category].label : "") + "</span>" +
      '<span class="stamp like">ХАДГАЛАХ</span><span class="stamp nope">АЛГАСАХ</span>' +
      '<div class="shade"></div><div class="over"><h3>' + esc(i.title) + '</h3><div class="p">' + esc(priceOf(i)) + "</div>" +
      '<div class="m">' + esc([meta, i.location ? "📍 " + i.location : null].filter(Boolean).join(" · ")) + "</div></div></div>" +
      '<div class="act">' + contactButtons(i, false) + "</div></div>";
  }
  function current() { return state.queue[state.pos]; }
  function renderDeck() {
    var deck = $("#deck");
    var top = state.queue[state.pos], next = state.queue[state.pos + 1];
    if (!top) {
      deck.innerHTML = '<div class="card done"><div style="font-size:3rem">🎉</div><h3>Энэ ангиллын бүх зарыг үзлээ</h3>' +
        '<p class="muted">Хадгалсан: ' + state.saved.length + " зар</p>" +
        '<div class="item-act" style="width:100%;max-width:320px"><button class="btn btn-ghost" id="restart">↺ Дахин эхлэх</button>' +
        '<button class="btn btn-primary" id="see-saved">❤️ Хадгалсан</button></div></div>';
      $("#restart").onclick = function () { state.pos = 0; renderDeck(); };
      $("#see-saved").onclick = function () { setView("saved"); };
      return;
    }
    deck.innerHTML = (next ? swipeCard(next, true) : "") + swipeCard(top, false);
    bindDrag(deck.lastElementChild);
  }
  function fling(dir) {
    var el = $("#deck .swipe:not(.behind)"); if (!el) return;
    var i = current();
    if (dir > 0 && i && !isSaved(i.id)) { state.saved.push(String(i.id)); storeSaved(); updateSavedCount(); }
    el.classList.add("anim");
    el.style.transform = "translateX(" + dir * 140 + "%) rotate(" + dir * 25 + "deg)";
    el.style.opacity = "0";
    var behind = $("#deck .swipe.behind");
    if (behind) { behind.classList.add("anim"); behind.classList.remove("behind"); }
    setTimeout(function () { state.pos++; renderDeck(); }, 300);
  }
  function bindDrag(el) {
    var sx = 0, sy = 0, dx = 0, dragging = false, moved = false, downOn = null;
    var like = el.querySelector(".stamp.like"), nope = el.querySelector(".stamp.nope");
    el.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a,button")) return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; downOn = e.target;
      el.setPointerCapture(e.pointerId); el.classList.remove("anim");
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dx = e.clientX - sx;
      var dy = e.clientY - sy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      el.style.transform = "translate(" + dx + "px," + dy * 0.2 + "px) rotate(" + dx / 18 + "deg)";
      like.style.opacity = Math.max(0, Math.min(1, dx / 100));
      nope.style.opacity = Math.max(0, Math.min(1, -dx / 100));
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > 100) return fling(dx > 0 ? 1 : -1);
      el.classList.add("anim"); el.style.transform = ""; like.style.opacity = 0; nope.style.opacity = 0;
      if (!moved && e.type === "pointerup") {
        // Tap: on the photo → next picture, on the text → details.
        if (downOn && downOn.closest(".over")) return openDetail(el.dataset.id);
        if (downOn && downOn.closest(".photo")) {
          var r = el.getBoundingClientRect();
          stepImage(el, e.clientX - r.left < r.width / 3 ? -1 : 1);
        }
      }
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  function stepImage(el, step) {
    var i = state.all.find(function (x) { return String(x.id) === el.dataset.id; });
    var imgs = (i && i.images) || [];
    if (imgs.length < 2) return openDetail(el.dataset.id);
    var k = (Number(el.dataset.img) + step + imgs.length) % imgs.length;
    el.dataset.img = k;
    el.querySelector(".photo").style.backgroundImage = 'url("' + imgs[k].replace(/"/g, "%22") + '")';
    el.querySelectorAll(".bars i").forEach(function (b, n) { b.classList.toggle("on", n === k); });
    var c = el.querySelector(".counter"); if (c) c.textContent = (k + 1) + " / " + imgs.length;
    // Warm the next picture so tapping feels instant.
    new Image().src = imgs[(k + 1) % imgs.length];
  }
  $("#deck").addEventListener("click", function (e) {
    var b = e.target.closest(".pnav"); if (!b) return;
    e.stopPropagation();
    stepImage(b.closest(".swipe"), Number(b.dataset.step));
  });
  $("#btn-like").onclick = function () { fling(1); };
  $("#btn-nope").onclick = function () { fling(-1); };
  $("#btn-info").onclick = function () { var i = current(); if (i) openDetail(i.id); };
  document.addEventListener("keydown", function (e) {
    if (state.view !== "swipe" || document.querySelector("dialog[open]") || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") fling(1);
    if (e.key === "ArrowLeft") fling(-1);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      var top = $("#deck .swipe:not(.behind)"); if (top) { e.preventDefault(); stepImage(top, e.key === "ArrowDown" ? 1 : -1); }
    }
  });

  // ---------- views ----------
  function updateSavedCount() { $("#saved-n").textContent = state.saved.length; }
  function setView(v) {
    state.view = v;
    document.querySelectorAll(".toggle button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === v); });
    $("#swipe-view").hidden = v !== "swipe";
    $("#grid-view").hidden = v !== "grid";
    $("#saved-view").hidden = v !== "saved";
    if (v === "saved") {
      renderGrid($("#saved-grid"), state.all.filter(function (i) { return isSaved(i.id); }),
        "Хадгалсан зар алга. Шудрах хэсэгт таалагдсан зараа баруун тийш шудраарай ❤️");
    }
  }
  document.querySelectorAll(".toggle button").forEach(function (b) { b.onclick = function () { setView(b.dataset.view); }; });

  function refresh(resetDeck) {
    var list = filtered();
    $("#count").textContent = list.length + " зар";
    renderCats();
    renderGrid($("#grid"), list, "Шүүлтүүрт тохирох зар олдсонгүй.");
    if (resetDeck) { state.queue = list; state.pos = 0; renderDeck(); }
    if (state.view === "saved") setView("saved");
    renderMap(list);
  }

  // ---------- map ----------
  function renderMap(list) {
    if (!window.L) return;
    if (!map) {
      map = L.map("leaflet", { scrollWheelZoom: false }).setView(CENTER, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
    }
    layer.clearLayers();
    var pts = [];
    list.forEach(function (i) {
      if (i.latitude == null || i.longitude == null) return;
      var ll = [i.latitude, i.longitude];
      pts.push(ll);
      L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="pin">' + esc(i.price ? short(i.price) : CAT[i.category].label) + "</div>", iconSize: [0, 0] }) })
        .on("click", function () { openDetail(i.id); }).addTo(layer);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    else if (pts.length === 1) map.setView(pts[0], 15);
    $("#map-note").textContent = pts.length ? pts.length + " зар газрын зураг дээр" : "Байршил тэмдэглэсэн зар одоогоор алга";
  }

  // ---------- detail dialog ----------
  function openDetail(id) {
    var i = state.all.find(function (x) { return String(x.id) === String(id); });
    if (!i) return;
    var dlg = $("#detail");
    var imgs = i.images || [];
    var spec = [["Ангилал", CAT[i.category] && CAT[i.category].label], ["Өрөө", i.rooms], ["Талбай", i.areaM2 ? i.areaM2 + " м²" : null],
      ["Газрын хэмжээ", i.landM2 ? i.landM2 + " м²" : null], ["Давхар", i.floor], ["м² үнэ", i.price && i.areaM2 ? mnt(i.price / i.areaM2) : null], ["Байршил", i.location]]
      .filter(function (r) { return r[1] != null && r[1] !== ""; });
    dlg.innerHTML =
      '<button class="close" aria-label="Хаах">×</button>' +
      '<div class="gwrap"><div class="gallery">' + (imgs.length ? imgs.map(function (s) { return '<img loading="lazy" alt="" src="' + esc(s) + '">'; }).join("")
        : '<div class="ph">' + esc(CAT[i.category] ? CAT[i.category].icon : "🏠") + "</div>") + "</div>" +
      (imgs.length > 1 ? '<button type="button" class="pnav prev" data-step="-1" aria-label="Өмнөх зураг">‹</button>' +
        '<button type="button" class="pnav next" data-step="1" aria-label="Дараагийн зураг">›</button>' +
        '<span class="counter">1 / ' + imgs.length + "</span>" : "") + "</div>" +
      (imgs.length > 1 ? '<div class="thumbs">' + imgs.map(function (s, n) {
        return '<button type="button" data-n="' + n + '"' + (n ? "" : ' class="on"') + '><img loading="lazy" alt="" src="' + esc(s) + '"></button>';
      }).join("") + "</div>" : "") +
      '<div class="detail-body"><h2>' + esc(i.title) + "</h2>" +
      '<span class="price" style="font-size:1.6rem">' + esc(priceOf(i)) + "</span>" +
      "<dl>" + spec.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" +
      (i.description ? '<p class="desc">' + esc(i.description) + "</p>" : "") +
      '<div class="detail-actions">' + contactButtons(i, true) +
      (i.url ? '<a class="btn btn-ghost" href="' + esc(i.url) + '">Сайт дээр харах</a>' : "") +
      (i.source ? '<a class="btn btn-ghost" target="_blank" rel="noopener noreferrer" href="' + esc(i.source) + '">Facebook пост</a>' : "") +
      '<button class="btn btn-ghost js-save">' + (isSaved(i.id) ? "❤️ Хадгалсан" : "🤍 Хадгалах") + "</button>" +
      "</div></div>";
    dlg.querySelector(".close").onclick = function () { dlg.close(); };
    dlg.querySelector(".js-save").onclick = function () {
      var k = state.saved.indexOf(String(i.id));
      if (k >= 0) state.saved.splice(k, 1); else state.saved.push(String(i.id));
      storeSaved(); updateSavedCount();
      this.textContent = isSaved(i.id) ? "❤️ Хадгалсан" : "🤍 Хадгалах";
      if (state.view === "saved") setView("saved");
    };
    dlg.onclick = function (e) { if (e.target === dlg) dlg.close(); };
    // Gallery: arrows, thumbnails, keyboard and swipe (native scroll-snap) all stay in sync.
    var gal = dlg.querySelector(".gallery");
    function cur() { return Math.round(gal.scrollLeft / (gal.clientWidth || 1)); }
    function go(n) { n = (n + imgs.length) % imgs.length; gal.scrollTo({ left: n * gal.clientWidth, behavior: "smooth" }); }
    function sync() {
      var n = cur(), c = dlg.querySelector(".counter");
      if (c) c.textContent = (n + 1) + " / " + imgs.length;
      dlg.querySelectorAll(".thumbs button").forEach(function (b, k) { b.classList.toggle("on", k === n); });
    }
    gal.addEventListener("scroll", function () { clearTimeout(gal._t); gal._t = setTimeout(sync, 60); });
    dlg.querySelectorAll(".gwrap .pnav").forEach(function (b) { b.onclick = function () { go(cur() + Number(b.dataset.step)); }; });
    dlg.querySelectorAll(".thumbs button").forEach(function (b) { b.onclick = function () { go(Number(b.dataset.n)); }; });
    dlg.onkeydown = function (e) {
      if (imgs.length < 2) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur() + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(cur() - 1); }
    };
    dlg.showModal();
  }

  // ---------- search ----------
  $("#search").addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    state.filter = { q: fd.get("q") || "", rooms: fd.get("rooms") || "", max: fd.get("max") || "" };
    refresh(true);
    document.getElementById("listings").scrollIntoView();
  });

  updateSavedCount();
  load().then(function () {
    // Unknown ids (e.g. listings removed since) are dropped from the saved list.
    var ids = state.all.map(function (i) { return String(i.id); });
    state.saved = state.saved.filter(function (s) { return ids.indexOf(s) >= 0; }); storeSaved(); updateSavedCount();
    renderStats(); refresh(true);
  }).catch(function () {
    $("#deck").innerHTML = '<div class="card done muted">Зар ачаалж чадсангүй. Хуудсаа дахин ачаална уу.</div>';
  });
})();
