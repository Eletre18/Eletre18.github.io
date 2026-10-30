(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  /* ---------- Splash: el vaso se llena y se va ---------- */
  var heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    var title = $(".hero-title");
    if (title) title.classList.add("is-revealed");
    $$(".hero [data-reveal]").forEach(function (el, i) {
      setTimeout(function () { el.classList.add("is-revealed"); }, 180 + i * 110);
    });
  }
  function initSplash() {
    var splash = $("[data-splash]");
    if (!splash) { startHero(); return; }
    var done = false;
    var hide = function () {
      if (done) return;
      done = true;
      splash.classList.add("is-out");
      setTimeout(startHero, 250);
    };
    var wait = reduced ? 300 : 1500;
    if (document.readyState === "complete") setTimeout(hide, wait);
    else window.addEventListener("load", function () { setTimeout(hide, wait); });
    setTimeout(hide, 3800); // seguridad extra
  }

  /* ---------- Split del título (respeta <em> y <br>) ---------- */
  function initSplit() {
    $$("[data-split]").forEach(function (el) {
      if (el.classList.contains("is-split")) return;
      el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
      var wrap = function (text) {
        return text.split(/(\s+)/).map(function (w) {
          return /^\s+$/.test(w) || !w ? w : '<span class="split-word" aria-hidden="true">' + escHTML(w) + "</span>";
        }).join("");
      };
      el.innerHTML = Array.prototype.map.call(el.childNodes, function (node) {
        if (node.nodeType === 3) return wrap(node.textContent);
        if (node.nodeName === "BR") return "<br>";
        if (node.nodeType === 1) {
          var tag = node.tagName.toLowerCase();
          return "<" + tag + ">" + wrap(node.textContent) + "</" + tag + ">";
        }
        return "";
      }).join("");
      $$(".split-word", el).forEach(function (w, i) { w.style.transitionDelay = (i * 0.12) + "s"; });
      el.classList.add("is-split");
    });
  }

  /* ---------- Nav: transparente → sólida ---------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("is-solid", window.scrollY > 24); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll suave nativo para anclas ---------- */
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navH = ($("[data-nav]") || { offsetHeight: 72 }).offsetHeight;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (id === "#inicio" ? 0 : navH), behavior: reduced ? "auto" : "smooth" });
      if (id === "#main") el.focus && el.focus();
    });
  }

  /* ---------- Contadores ---------- */
  function fmt(v, dec) { return v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, dur = reduced ? 900 : 1700, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e, dec);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to, dec);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Revelados al hacer scroll (threshold bajo + red de 6s) ---------- */
  function initReveals() {
    var els = $$("[data-reveal]").filter(function (el) { return !el.closest(".hero"); });
    $$("[data-count]").forEach(function (el) { el.textContent = fmt(0, +el.dataset.dec || 0); });
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      $$("[data-count]").forEach(countUp);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-revealed");
        $$("[data-count]", e.target).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-revealed");
          $$("[data-count]", el).forEach(countUp);
        }
      });
    }, 6000);
  }

  /* ---------- Formulario de demostración ---------- */
  function initForm() {
    var form = $("#form");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    var err = $("#form-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = $("#f-nombre"), wsp = $("#f-wsp");
      $$(".field", form).forEach(function (f) { f.classList.remove("has-error"); });
      var missing = [];
      if (!nombre.value.trim()) { missing.push("el nombre del comercio"); nombre.parentNode.classList.add("has-error"); }
      if (wsp.value.replace(/\D/g, "").length < 8) { missing.push("un WhatsApp de al menos 8 números"); wsp.parentNode.classList.add("has-error"); }
      if (missing.length) { err.textContent = "Completá " + missing.join(" y ") + "."; (missing[0].indexOf("nombre") > -1 ? nombre : wsp).focus(); return; }
      err.textContent = "";
      $(".form-body", form).hidden = true;
      $("#form-done-title").textContent = "¡Gracias, " + nombre.value.trim() + "!";
      var done = $("#form-done");
      if (data.form && data.form.demoNotice) $(".form-done-text", done).textContent = data.form.demoNotice;
      done.hidden = false;
    });
  }

  /* ---------- Parallax suave del hero (GSAP) ---------- */
  function initParallax() {
    var visual = $("[data-parallax]");
    if (!visual) return;
    gsap.to(visual, { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-blob", { yPercent: 18, rotate: 20, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.utils.toArray(".step-media").forEach(function (m, i) {
      gsap.fromTo(m, { y: 30 }, { y: -30, ease: "none", scrollTrigger: { trigger: m, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  function boot() {
    root.classList.add("js-ok");
    safe(initSplit, "initSplit");
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initAnchors, "initAnchors");
    safe(initReveals, "initReveals");
    safe(initForm, "initForm");
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initParallax, "initParallax");
      window.addEventListener("load", function () { try { ScrollTrigger.refresh(); } catch (_) {} });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
