// mechanical-turk.dev — small progressive enhancements. The site works without JS.
(function () {
  "use strict";
  var root = document.documentElement;

  // ----- theme toggle -----
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    });
  });

  // ----- language menu: close on outside click / Escape -----
  var langs = document.querySelectorAll("[data-lang]");
  document.addEventListener("click", function (ev) {
    langs.forEach(function (d) { if (d.open && !d.contains(ev.target)) d.open = false; });
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") langs.forEach(function (d) { d.open = false; });
  });

  // ----- galleries -----
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var slides = g.querySelectorAll(".gallery__slide");
    var label = g.querySelector("[data-gallery-index]");
    var index = 0;
    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.hidden = n !== index; });
      if (label) label.textContent = String(index + 1);
    }
    var prev = g.querySelector("[data-gallery-prev]");
    var next = g.querySelector("[data-gallery-next]");
    if (prev) prev.addEventListener("click", function () { show(index - 1); });
    if (next) next.addEventListener("click", function () { show(index + 1); });
  });

  // ----- media viewer (images, videos, simulations) -----
  var viewer = document.querySelector("[data-viewer]");
  var stage = viewer && viewer.querySelector("[data-viewer-stage]");
  var titleEl = viewer && viewer.querySelector("[data-viewer-title]");

  function embedUrl(url) {
    var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
    if (m) return "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1";
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return "https://player.vimeo.com/video/" + m[1] + "?autoplay=1";
    m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
    return url;
  }

  function openViewer(kind, url, title, alt) {
    if (!viewer || typeof viewer.showModal !== "function") { window.open(url, "_blank", "noopener"); return; }
    stage.textContent = "";
    titleEl.textContent = title || "";
    var el;
    if (kind === "image") {
      el = document.createElement("img");
      el.src = url; el.alt = alt || "";
    } else if (kind === "video" && /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
      el = document.createElement("video");
      el.src = url; el.controls = true; el.autoplay = true; el.playsInline = true;
    } else {
      el = document.createElement("iframe");
      el.src = embedUrl(url);
      el.title = title || "";
      el.allow = "autoplay; fullscreen; picture-in-picture";
      el.allowFullscreen = true;
      el.loading = "lazy";
    }
    stage.appendChild(el);
    if (kind !== "image") {
      var p = document.createElement("p");
      p.className = "viewer__fallback";
      var a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = url + " ↗";
      p.appendChild(a);
      stage.appendChild(p);
    }
    viewer.showModal();
  }

  document.addEventListener("click", function (ev) {
    var img = ev.target.closest("[data-lightbox]");
    if (img) { openViewer("image", img.dataset.lightbox, img.dataset.alt, img.dataset.alt); return; }
    var media = ev.target.closest("[data-media]");
    if (media) openViewer(media.dataset.mediaKind, media.dataset.media, media.dataset.mediaTitle);
  });
  if (viewer) {
    viewer.querySelector("[data-viewer-close]").addEventListener("click", function () { viewer.close(); });
    viewer.addEventListener("click", function (ev) { if (ev.target === viewer) viewer.close(); });
    viewer.addEventListener("close", function () { stage.textContent = ""; });
  }

  // ----- timeline: fade into view on scroll -----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ----- sidebar: glide in proportion to the page scroll, so both hit top/bottom together -----
  var side = document.querySelector(".sidebar__inner");
  if (side) {
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var manual = false;
    var frame = 0;

    function sideTarget() {
      var pageRange = document.documentElement.scrollHeight - window.innerHeight;
      var progress = pageRange > 0 ? Math.min(1, Math.max(0, window.scrollY / pageRange)) : 0;
      return progress * (side.scrollHeight - side.clientHeight);
    }
    function glide() {
      frame = 0;
      if (manual || side.scrollHeight <= side.clientHeight) return;
      var target = sideTarget();
      var diff = target - side.scrollTop;
      if (reduceMotion || Math.abs(diff) < 1) { side.scrollTop = target; return; }
      side.scrollTop += diff * 0.12;
      frame = requestAnimationFrame(glide);
    }
    function follow() {
      manual = false;
      if (!frame) frame = requestAnimationFrame(glide);
    }
    // The visitor scrolling the sidebar itself takes over until the page scrolls again.
    function takeOver() {
      manual = true;
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
    }
    ["wheel", "touchstart", "pointerdown", "keydown"].forEach(function (type) {
      side.addEventListener(type, takeOver, { passive: true });
    });
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    side.scrollTop = sideTarget();
  }

  // ----- skill logos: show the logo once it loads, keep the monogram if it fails -----
  document.querySelectorAll(".skill__logo[data-src]").forEach(function (el) {
    var probe = new Image();
    probe.onload = function () { el.classList.add("is-loaded"); };
    probe.src = el.dataset.src;
  });
})();
