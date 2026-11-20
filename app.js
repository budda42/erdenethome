(function () {
  "use strict";
  var cfg = window.EH_CONFIG || {};
  var APP = (cfg.appUrl || "").replace(/\/+$/, "");
  var CENTER = [49.0333, 104.05]; // Erdenet

  var state = { all: [], showcase: [], live: false, filter: { q: "", rooms: "", deal: "", max: "" } };
  var map, layer;

  // ---------- helpers ----------
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function mnt(n) { return n == null ? "—" : Math.round(n).toLocaleString("en-US").replace(/,/g, " ") + " ₮"; }
  function short(n) {
    if (n == null) return "";
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + " тэрбум";
    if (n >= 1e6) return Math.round(n / 1e6) + " сая";
    return mnt(n);
  }
  function $(s) { return document.querySelector(s); }
  function appLink(path) { return APP ? APP + path : null; }

  // ---------- static wiring ----------
  document.getElementById("year").textContent = new Date().getFullYear();
  document.querySelectorAll(".js-fb").forEach(function (a) { a.href = cfg.facebook || "#"; });
  if (cfg.phone) { var p = $(".js-phone"); p.hidden = false; p.href = "tel:" + cfg.phone.replace(/\s/g, ""); p.textContent = "📞 " + cfg.phone; }
  if (cfg.email) { var e = $(".js-email"); e.hidden = false; e.href = "mailto:" + cfg.email; e.textContent = "✉️ " + cfg.email; }
  document.querySelectorAll(".js-app").forEach(function (a) {
    var url = appLink(a.dataset.path || "/");
    if (url) { a.href = url; a.hidden = false; }
    else if (a.dataset.path === "/register") a.hidden = true; // nowhere to sign up yet
  });

  // ---------- data ----------
  function fromLive(items) {
    return items.map(function (i) {
      return {
        id: i.id, name: i.name, address: i.address, district: i.district, rooms: i.rooms, areaM2: i.areaM2,
        price: i.price, dealType: i.dealType, latitude: i.latitude, longitude: i.longitude,
        coverUrl: i.coverUrl ? (/^https?:/.test(i.coverUrl) ? i.coverUrl : APP + i.coverUrl) : null,
        status: i.status, url: APP + "/properties/" + i.id, description: "",
      };
    });
  }

  function load() {
    var live = APP
      ? fetch(APP + "/api/properties?pageSize=200", { headers: { Accept: "application/json" } })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (j) { if (!j.ok) throw new Error("api"); state.live = true; return { listings: fromLive(j.data.items), showcase: [] }; })
      : Promise.reject("no app");
    return live.catch(function () {
      return fetch("data/listings.json").then(function (r) { return r.json(); });
    }).then(function (d) {
      state.all = d.listings || [];
      state.showcase = d.showcase || [];
    });
  }

  // ---------- render ----------
  function filtered() {
    var f = state.filter, q = f.q.trim().toLowerCase();
    return state.all.filter(function (i) {
      if (q && (i.name + " " + i.address + " " + (i.district || "")).toLowerCase().indexOf(q) < 0) return false;
      if (f.rooms && (f.rooms === "4" ? (i.rooms || 0) < 4 : String(i.rooms) !== f.rooms)) return false;
      if (f.deal && i.dealType !== f.deal) return false;
      if (f.max && (i.price || 0) > Number(f.max)) return false;
      return true;
    });
  }

  function renderStats() {
    var all = state.all;
    if (!all.length) { $("#stats").innerHTML = ""; return; }
    var prices = all.map(function (i) { return i.price; }).filter(Boolean);
    var min = Math.min.apply(null, prices);
    $("#stats").innerHTML =
      '<span class="stat"><b>' + all.length + "</b>идэвхтэй зар</span>" +
      (prices.length ? '<span class="stat"><b>' + esc(short(min)) + " ₮</b>хамгийн хямд</span>" : "") +
      (state.live ? '<span class="stat">🟢 Шууд шинэчлэгддэг</span>' : "");
  }

  function card(i) {
    var per = i.price && i.areaM2 ? '<span class="per-m2">м² ' + esc(mnt(i.price / i.areaM2)) + "</span>" : "";
    return '<article class="card item" data-id="' + esc(i.id) + '" tabindex="0">' +
      '<div class="thumb' + (i.coverUrl ? "" : " noimg") + '">' + (i.coverUrl ? '<img loading="lazy" alt="" src="' + esc(i.coverUrl) + '">' : "🏢") +
      '<span class="badge">' + (i.dealType === "rent" ? "Түрээс" : "Худалдаа") + "</span></div>" +
      '<div class="item-body"><h3>' + esc(i.name) + "</h3>" +
      '<span class="item-meta">' + esc([i.rooms != null ? i.rooms + " өрөө" : null, i.areaM2 ? i.areaM2 + " м²" : null, i.district].filter(Boolean).join(" · ")) + "</span>" +
      '<span class="item-meta">' + esc(i.address) + "</span>" +
      '<span class="price">' + esc(mnt(i.price)) + (i.dealType === "rent" ? " / сар" : "") + "</span>" + per +
      "</div></article>";
  }

  function renderList() {
    var list = filtered();
    $("#count").textContent = list.length + " зар";
    $("#grid").innerHTML = list.length
      ? list.map(card).join("")
      : '<div class="card empty muted">Шүүлтүүрт тохирох зар олдсонгүй.</div>';
    $("#showcase").innerHTML = state.showcase.map(function (p) {
      return '<div class="card project"><span class="tag">ШИНЭ ТӨСӨЛ</span><h3>' + esc(p.name) + "</h3>" +
        '<span class="muted">' + esc(p.address) + "</span><p>" + esc(p.description) + "</p>" +
        '<div><a class="btn btn-fb" target="_blank" rel="noopener noreferrer" href="' + esc(cfg.facebook) + '">Дэлгэрэнгүй асуух</a></div></div>';
    }).join("");
    renderMap(list);
  }

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
      L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="pin">' + esc(short(i.price)) + "</div>", iconSize: [0, 0] }) })
        .on("click", function () { openDetail(i.id); })
        .addTo(layer);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    else if (pts.length === 1) map.setView(pts[0], 16);
    $("#map-note").textContent = pts.length
      ? pts.length + " зар газрын зураг дээр"
      : "Байршил оруулсан зар одоогоор алга";
  }

  // ---------- detail dialog ----------
  function openDetail(id) {
    var i = state.all.find(function (x) { return String(x.id) === String(id); });
    if (!i) return;
    var dlg = $("#detail");
    var spec = [["Өрөө", i.rooms], ["Талбай", i.areaM2 ? i.areaM2 + " м²" : null], ["м² үнэ", i.price && i.areaM2 ? mnt(i.price / i.areaM2) : null],
      ["Хороолол", i.district], ["Төрөл", i.dealType === "rent" ? "Түрээс" : "Худалдаа"], ["Зарын №", i.id]]
      .filter(function (r) { return r[1] != null && r[1] !== ""; });
    dlg.innerHTML =
      '<button class="close" aria-label="Хаах">×</button>' +
      '<div class="thumb' + (i.coverUrl ? "" : " noimg") + '">' + (i.coverUrl ? '<img alt="" src="' + esc(i.coverUrl) + '">' : "🏢") + "</div>" +
      '<div class="detail-body"><h2>' + esc(i.name) + '</h2><span class="muted">' + esc(i.address) + "</span>" +
      '<span class="price" style="font-size:1.6rem">' + esc(mnt(i.price)) + "</span>" +
      "<dl>" + spec.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" +
      (i.description ? '<p class="muted">' + esc(i.description) + "</p>" : "") +
      '<div class="detail-actions">' +
      (i.url ? '<a class="btn btn-primary" href="' + esc(i.url) + '">Дэлгэрэнгүй / хүсэлт илгээх</a>' : "") +
      '<a class="btn btn-fb" target="_blank" rel="noopener noreferrer" href="' + esc(cfg.facebook) + '">Facebook-ээр асуух</a>' +
      (cfg.phone ? '<a class="btn btn-ghost" href="tel:' + esc(cfg.phone.replace(/\s/g, "")) + '">📞 Залгах</a>' : "") +
      "</div></div>";
    dlg.querySelector(".close").onclick = function () { dlg.close(); };
    dlg.onclick = function (e) { if (e.target === dlg) dlg.close(); };
    dlg.showModal();
  }

  $("#grid").addEventListener("click", function (e) {
    var el = e.target.closest(".item"); if (el) openDetail(el.dataset.id);
  });
  $("#grid").addEventListener("keydown", function (e) {
    var el = e.target.closest(".item"); if (el && e.key === "Enter") openDetail(el.dataset.id);
  });

  // ---------- search ----------
  $("#search").addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    state.filter = { q: fd.get("q") || "", rooms: fd.get("rooms") || "", deal: fd.get("deal") || "", max: fd.get("max") || "" };
    renderList();
    document.getElementById("listings").scrollIntoView();
  });

  load().then(function () { renderStats(); renderList(); }).catch(function () {
    $("#grid").innerHTML = '<div class="card empty muted">Зар ачаалж чадсангүй. Хуудсаа дахин ачаална уу.</div>';
  });
})();
