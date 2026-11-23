(function () {
  "use strict";
  var cfg = window.EH_CONFIG || {};
  var gh = cfg.github || {};
  var CENTER = [49.0333, 104.05];
  var TOKEN_KEY = "eh_gh_token";

  var listings = [], pins = {}, sel = null, dirty = false;
  var map = L.map("lmap").setView(CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  function $(s) { return document.querySelector(s); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function r6(n) { return Math.round(n * 1e6) / 1e6; }
  function group(i) { return i.title.split(" · ")[0]; }
  function msg(t, kind) { var m = $("#msg"); m.textContent = t; m.className = "msg " + (kind || ""); }
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }

  function pinIcon(active) {
    return L.divIcon({
      className: "",
      html: '<svg class="pinx" viewBox="0 0 32 42"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="' +
        (active ? "#dc2626" : "#167653") + '" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>',
      iconSize: [30, 40],
      iconAnchor: [15, 40],
    });
  }

  function renderList() {
    var done = listings.filter(function (i) { return pins[i.id]; }).length;
    $("#progress").textContent = done + " / " + listings.length + " байршилтай";
    $("#list").innerHTML = listings.map(function (i) {
      return '<button type="button" class="loc-item' + (sel === i.id ? " on" : "") + '" data-id="' + esc(i.id) + '">' +
        '<span class="dot' + (pins[i.id] ? " set" : "") + '"></span><span>' + esc(i.title) +
        "<small>" + esc(i.location || "") + "</small></span></button>";
    }).join("");
  }

  function renderPins() {
    layer.clearLayers();
    listings.forEach(function (i) {
      var p = pins[i.id]; if (!p) return;
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(i.id === sel), draggable: i.id === sel, zIndexOffset: i.id === sel ? 1000 : 0 })
        .bindTooltip(esc(i.title))
        .on("click", function () { select(i.id); })
        .on("dragend", function (e) { var ll = e.target.getLatLng(); setPin(ll.lat, ll.lng); });
      m.addTo(layer);
    });
  }

  function select(id) {
    sel = id;
    var i = listings.find(function (x) { return x.id === id; });
    var p = pins[id];
    $("#sel").innerHTML = "Сонгосон: <b>" + esc(i.title) + "</b> — " +
      (p ? "байршил: " + p.lat + ", " + p.lng + " (тэмдэгийг чирж засна)" : "газрын зураг дээр дарж байршлыг тэмдэглэнэ үү");
    if (p) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
    else if (i.location) $("#q").value = i.location.replace(/\(.*?\)/g, "").trim();
    renderList(); renderPins();
  }

  function setPin(lat, lng) {
    if (!sel) return msg("Эхлээд зүүн талаас зар сонгоно уу.", "err");
    var i = listings.find(function (x) { return x.id === sel; });
    var targets = $("#group").checked ? listings.filter(function (x) { return group(x) === group(i); }) : [i];
    targets.forEach(function (t) { pins[t.id] = { lat: r6(lat), lng: r6(lng) }; });
    dirty = true;
    msg(targets.length > 1 ? targets.length + " зарт байршил өглөө. Хадгалахаа мартуузай." : "Байршил өглөө. Хадгалахаа мартуузай.");
    select(sel);
  }

  map.on("click", function (e) { setPin(e.latlng.lat, e.latlng.lng); });
  $("#list").addEventListener("click", function (e) { var b = e.target.closest(".loc-item"); if (b) select(b.dataset.id); });
  $("#clear").onclick = function () {
    if (!sel) return;
    var i = listings.find(function (x) { return x.id === sel; });
    var targets = $("#group").checked ? listings.filter(function (x) { return group(x) === group(i); }) : [i];
    targets.forEach(function (t) { delete pins[t.id]; });
    dirty = true; msg("Байршил арилгалаа. Хадгалахаа мартуузай."); select(sel);
  };

  // Address search (OpenStreetMap Nominatim, biased to Erdenet).
  function search() {
    var q = $("#q").value.trim(); if (q.length < 2) return;
    var u = new URL("https://nominatim.openstreetmap.org/search");
    u.search = new URLSearchParams({ q: /эрдэнэт|erdenet/i.test(q) ? q : q + ", Эрдэнэт", format: "json", limit: "6",
      countrycodes: "mn", "accept-language": "mn", viewbox: "103.90,49.10,104.20,48.95" }).toString();
    fetch(u).then(function (r) { return r.json(); }).then(function (hits) {
      var box = $("#hits");
      box.hidden = false;
      box.innerHTML = hits.length ? hits.map(function (h) {
        return '<button type="button" data-lat="' + h.lat + '" data-lng="' + h.lon + '">' + esc(h.display_name) + "</button>";
      }).join("") : '<button type="button" disabled>Олдсонгүй — газрын зураг дээр шууд дарна уу.</button>';
    }).catch(function () { msg("Хайлт амжилтгүй. Газрын зураг дээр шууд дарна уу.", "err"); });
  }
  $("#find").onclick = search;
  $("#q").addEventListener("keydown", function (e) { if (e.key === "Enter") search(); });
  $("#hits").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-lat]"); if (!b) return;
    var lat = Number(b.dataset.lat), lng = Number(b.dataset.lng);
    map.setView([lat, lng], 17); $("#hits").hidden = true;
    if (sel) setPin(lat, lng);
  });
  $("#gps").onclick = function () {
    if (!navigator.geolocation) return msg("Төхөөрөмж байршил тодорхойлохыг дэмжихгүй.", "err");
    navigator.geolocation.getCurrentPosition(function (p) {
      map.setView([p.coords.latitude, p.coords.longitude], 17);
      if (sel) setPin(p.coords.latitude, p.coords.longitude);
    }, function () { msg("Байршлын зөвшөөрөл олгогдсонгүй.", "err"); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  // ---------- saving ----------
  function payload() {
    var out = {};
    Object.keys(pins).sort().forEach(function (k) { out[k] = pins[k]; });
    return JSON.stringify(out, null, 2) + "\n";
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  function saveWithToken(t) {
    var api = "https://api.github.com/repos/" + gh.repo + "/contents/" + gh.path;
    var h = { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" };
    msg("Хадгалж байна…");
    return fetch(api + "?ref=" + encodeURIComponent(gh.branch), { headers: h })
      .then(function (r) { return r.status === 404 ? {} : r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (cur) {
        return fetch(api, { method: "PUT", headers: h, body: JSON.stringify({
          message: "Update listing locations", content: b64(payload()), branch: gh.branch, sha: cur.sha,
        }) });
      })
      .then(function (r) { if (!r.ok) return Promise.reject(r.status); dirty = false; msg("✅ Хадгалагдлаа. Сайт 1–2 минутын дараа шинэчлэгдэнэ.", "ok"); })
      .catch(function (s) { msg("Хадгалж чадсангүй (" + s + "). Token-ий эрхийг шалгана уу.", "err"); });
  }

  function saveManually() {
    var text = payload();
    var url = "https://github.com/" + gh.repo + "/edit/" + gh.branch + "/" + gh.path;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () {
        msg("📋 Хуулагдлаа. Нээгдсэн GitHub хуудсанд Ctrl+A → Ctrl+V хийгээд \"Commit changes\" дарна уу.", "ok");
        window.open(url, "_blank", "noopener");
      })
      .catch(function () {
        msg("Хуулж чадсангүй. Доорх текстийг гараар хуулна уу.", "err");
        window.prompt("Энэ текстийг хуулна уу:", text);
        window.open(url, "_blank", "noopener");
      });
  }

  $("#save").onclick = function () { var t = token(); if (t) saveWithToken(t); else saveManually(); };
  $("#token-save").onclick = function () {
    var v = $("#token").value.trim(); if (!v) return;
    try { localStorage.setItem(TOKEN_KEY, v); } catch (e) { return msg("Хөтөч token хадгалахыг зөвшөөрсөнгүй.", "err"); }
    $("#token").value = ""; msg("Token хадгалагдлаа. Одоо \"Хадгалах\" нэг товчоор ажиллана.", "ok");
  };
  $("#token-del").onclick = function () { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } msg("Token устгагдлаа."); };
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- load ----------
  Promise.all([
    fetch("data/listings.json", { cache: "no-cache" }).then(function (r) { return r.json(); }),
    fetch("data/locations.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return {}; }),
  ]).then(function (r) {
    listings = (r[0].listings || []).map(function (i) { return { id: String(i.id), title: i.title, location: i.location }; });
    pins = r[1] || {};
    (r[0].listings || []).forEach(function (i) {
      if (!pins[i.id] && i.latitude != null && i.longitude != null) pins[i.id] = { lat: i.latitude, lng: i.longitude };
    });
    renderList(); renderPins();
    var pts = Object.keys(pins).map(function (k) { return [pins[k].lat, pins[k].lng]; });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  });
})();
