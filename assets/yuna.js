/* YUNA design layer · interactions
   Vanilla JS, no dependencies. Every module is scoped to a root so it can be
   re-initialised when the theme editor reloads a section. */
(function () {
  'use strict';
  var Y = window.YUNA = window.YUNA || {};
  var doc = document, html = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqMobile = window.matchMedia('(max-width: 900px)');
  html.classList.add('yn-js');
  if (Y.animations !== false && !reduce && !Y.designMode) html.classList.add('yn-anim');

  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); }
  function raf(fn) { var t = false; return function () { if (t) return; t = true; requestAnimationFrame(function () { t = false; fn(); }); }; }

  /* ---------- money ---------- */
  Y.formatMoney = function (cents, trimZeros) {
    cents = Math.round(Number(cents) || 0);
    var fmt = Y.moneyFormat || '${{amount}}';
    function delim(n, prec, th, dec) {
      var parts = (n / 100).toFixed(prec).split('.');
      parts[0] = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + th);
      return parts[1] ? parts[0] + dec + parts[1] : parts[0];
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (m, key) {
      var noDec = trimZeros && cents % 100 === 0;
      switch (key) {
        case 'amount': return delim(cents, noDec ? 0 : 2, ',', '.');
        case 'amount_no_decimals': return delim(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return delim(cents, noDec ? 0 : 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return delim(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return delim(cents, noDec ? 0 : 2, "'", '.');
        default: return delim(cents, 2, ',', '.');
      }
    });
  };

  /* ---------- reveal on scroll ---------- */
  var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }) : null;
  function initReveal(root) {
    $$('.yn-rv', root).forEach(function (el) {
      if (!revealIO || !html.classList.contains('yn-anim')) { el.classList.add('is-in'); return; }
      revealIO.observe(el);
    });
  }

  /* ---------- announcement rotator ---------- */
  function initRotator(root) {
    $$('[data-yn-rotator]', root).forEach(function (bar) {
      if (bar._yn) return; bar._yn = 1;
      var items = $$('.yn-announce__item', bar); if (items.length < 2) return;
      var i = 0, ms = (parseFloat(bar.dataset.interval) || 4) * 1000;
      if (reduce) return;
      setInterval(function () {
        items[i].classList.remove('is-on'); items[i].setAttribute('aria-hidden', 'true');
        i = (i + 1) % items.length;
        items[i].classList.add('is-on'); items[i].removeAttribute('aria-hidden');
      }, ms);
    });
  }

  /* ---------- header + mobile nav ---------- */
  function initHeader(root) {
    var hdr = $('[data-yn-header]', root);
    if (hdr && !hdr._yn) {
      hdr._yn = 1;
      var upd = raf(function () { hdr.classList.toggle('is-pill', window.scrollY > 40); });
      on(window, 'scroll', upd, { passive: true }); upd();
    }
    var nav = $('[data-yn-nav]', root) || $('[data-yn-nav]');
    if (!nav || nav._yn) return; nav._yn = 1;
    var panel = $('.yn-mnav__panel', nav), lastFocus = null;
    function open() {
      lastFocus = doc.activeElement;
      nav.classList.add('is-open'); nav.setAttribute('aria-hidden', 'false'); html.classList.add('yn-lock');
      $$('[data-yn-nav-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      setTimeout(function () { panel && panel.focus(); }, 50);
    }
    function close() {
      nav.classList.remove('is-open'); nav.setAttribute('aria-hidden', 'true'); html.classList.remove('yn-lock');
      $$('[data-yn-nav-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (lastFocus) lastFocus.focus();
    }
    on(doc, 'click', function (e) {
      if (e.target.closest('[data-yn-nav-open]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-yn-nav-close]')) { e.preventDefault(); close(); }
    });
    on(doc, 'keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = $$('a,button,input', panel).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    mqMobile.addEventListener && mqMobile.addEventListener('change', function (m) { if (!m.matches && nav.classList.contains('is-open')) close(); });
  }

  /* ---------- hero slider ---------- */
  function initHero(root) {
    $$('[data-yn-hero]', root).forEach(function (h) {
      if (h._yn) return; h._yn = 1;
      var slides = $$('.yn-hero__slide', h), dots = $$('[data-yn-dot]', h);
      if (slides.length < 2) return;
      var i = 0, t = null, ms = (parseFloat(h.dataset.interval) || 4) * 1000;
      slides.forEach(function (s) { var im = $('img', s); if (im) im.loading = 'eager'; });
      function go(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
        dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      }
      function play() { clearInterval(t); if (!reduce && !Y.designMode) t = setInterval(function () { go(i + 1); }, ms); }
      dots.forEach(function (d) { on(d, 'click', function () { go(+d.dataset.ynDot); play(); }); });
      on(doc, 'visibilitychange', function () { if (doc.hidden) clearInterval(t); else play(); });
      play();
      h._ynGo = go;
    });
  }

  /* ---------- seamless marquee rows ---------- */
  function fillLoop(row) {
    var track = row.querySelector('.yn-mrow__track'); if (!track) return;
    if (!track._orig) track._orig = $$(':scope > *', track).filter(function (c) { return !c.hasAttribute('data-clone'); });
    $$(':scope > [data-clone]', track).forEach(function (c) { c.remove(); });
    var orig = track._orig; if (!orig.length) return;
    function cloneSet() {
      orig.forEach(function (k) {
        var c = k.cloneNode(true); c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true');
        c.removeAttribute('data-shopify-editor-block');
        $$('a,button,video,input', c).forEach(function (x) { x.setAttribute('tabindex', '-1'); });
        track.appendChild(c);
      });
    }
    var setW = track.scrollWidth, need = window.innerWidth * 1.1, sets = 1;
    while (setW * sets < need && sets < 12) { cloneSet(); sets++; }
    var halfCount = track.children.length;
    for (var j = 0; j < halfCount; j++) {
      var c = track.children[j].cloneNode(true); c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('data-shopify-editor-block');
      $$('a,button,video,input', c).forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      track.appendChild(c);
    }
    var base = parseFloat(getComputedStyle(row).getPropertyValue('--mq-dur')) || 40;
    track.style.animationDuration = (base * sets) + 's';
  }
  function initLoops(root) {
    $$('[data-yn-loop]', root).forEach(function (row) {
      if (reduce) return;
      fillLoop(row);
      if (!row._ynR) { row._ynR = 1; var t; on(window, 'resize', function () { clearTimeout(t); t = setTimeout(function () { fillLoop(row); }, 250); }); }
    });
  }

  /* ---------- arrow scrollers ---------- */
  function initScrollers(root) {
    $$('[data-yn-scroller]', root).forEach(function (sc) {
      if (sc._yn) return; sc._yn = 1;
      var sec = sc.closest('section') || root;
      var prev = $('[data-yn-prev]', sec), next = $('[data-yn-next]', sec);
      function step(d) {
        var card = sc.firstElementChild; if (!card) return;
        var gap = parseFloat(getComputedStyle(sc).columnGap || getComputedStyle(sc).gap) || 18;
        sc.scrollBy({ left: d * (card.getBoundingClientRect().width + gap), behavior: reduce ? 'auto' : 'smooth' });
      }
      function upd() {
        if (prev) prev.disabled = sc.scrollLeft < 4;
        if (next) next.disabled = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4;
      }
      on(prev, 'click', function () { step(-1); });
      on(next, 'click', function () { step(1); });
      on(sc, 'scroll', raf(upd), { passive: true }); on(window, 'resize', raf(upd));
      setTimeout(upd, 200);
      // trackpad / shift+wheel horizontal scrolling
      on(sc, 'wheel', function (e) {
        var dx = e.deltaX, dy = e.deltaY;
        if (Math.abs(dx) > Math.abs(dy) || (e.shiftKey && dy)) {
          var d = Math.abs(dx) > Math.abs(dy) ? dx : dy, max = sc.scrollWidth - sc.clientWidth;
          if ((d < 0 && sc.scrollLeft > 0) || (d > 0 && sc.scrollLeft < max)) { sc.scrollLeft += d; e.preventDefault(); }
        }
      }, { passive: false });
    });
  }

  /* ---------- stat rings + count up ---------- */
  function initRings(root) {
    var rings = $$('[data-yn-ring]', root); if (!rings.length) return;
    function run(r) {
      r.classList.add('is-in');
      var b = $('[data-yn-count]', r), n = b && $('span', b); if (!n) return;
      var to = parseFloat(b.dataset.ynCount) || 0;
      if (reduce) { n.textContent = to; return; }
      var t0 = null;
      (function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1600); p = 1 - Math.pow(1 - p, 3); n.textContent = Math.round(to * p); if (p < 1) requestAnimationFrame(step); })(performance.now());
    }
    if (!('IntersectionObserver' in window) || Y.designMode) { rings.forEach(run); return; }
    rings.forEach(function (r) { var n = $('[data-yn-count] span', r); if (n && !reduce) n.textContent = '0'; });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.4 });
    rings.forEach(function (r) { io.observe(r); });
  }

  /* ---------- night timeline ---------- */
  function initTimelines(root) {
    $$('[data-yn-timeline]', root).forEach(function (tl) {
      if (tl._yn) return; tl._yn = 1;
      var steps = $$('.yn-tl__step', tl), list = $('.yn-tl__steps', tl);
      if (list) list.style.setProperty('--steps', steps.length);
      if (reduce) { tl.style.setProperty('--p', 1); steps.forEach(function (s) { s.classList.add('is-lit'); }); return; }
      var tick = raf(function () {
        var r = tl.getBoundingClientRect(), vh = window.innerHeight, p;
        if (mqMobile.matches) {
          p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
          tl.style.setProperty('--p', p.toFixed(3));
          steps.forEach(function (s) { var no = $('.yn-tl__no', s); s.classList.toggle('is-lit', no.getBoundingClientRect().top < vh * 0.62); });
        } else {
          p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.45)));
          tl.style.setProperty('--p', p.toFixed(3));
          var w = r.width * p;
          steps.forEach(function (s) { s.classList.toggle('is-lit', p > 0 && (s.getBoundingClientRect().left - r.left) <= w + 2); });
        }
      });
      on(window, 'scroll', tick, { passive: true }); on(window, 'resize', tick); tick();
    });
  }

  /* ---------- reels: autoplay muted + lightbox ---------- */
  var vbox = null;
  function getVbox() {
    if (vbox) return vbox;
    vbox = doc.createElement('div'); vbox.className = 'yn yn-vbox'; vbox.hidden = true;
    vbox.setAttribute('role', 'dialog'); vbox.setAttribute('aria-modal', 'true'); vbox.setAttribute('aria-label', 'Customer video');
    vbox.innerHTML = '<div class="yn-vbox__in"><video playsinline controls></video><button type="button" class="yn-vbox__x" aria-label="Close video"><svg class="yn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    doc.body.appendChild(vbox);
    var v = $('video', vbox);
    function close() { v.pause(); v.removeAttribute('src'); v.load(); vbox.hidden = true; $$('.yn-mrow--reels').forEach(function (r) { r.classList.remove('is-paused'); }); if (vbox._from) vbox._from.focus(); }
    on(vbox, 'click', function (e) { if (e.target === vbox || e.target.closest('.yn-vbox__x')) close(); });
    on(doc, 'keydown', function (e) { if (e.key === 'Escape' && !vbox.hidden) close(); });
    vbox._open = function (src, from) {
      vbox._from = from; v.src = src; vbox.hidden = false; v.muted = false;
      $$('.yn-mrow--reels').forEach(function (r) { r.classList.add('is-paused'); });
      var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play(); });
      $('.yn-vbox__x', vbox).focus();
    };
    return vbox;
  }
  function initReels(root) {
    $$('[data-yn-reels]', root).forEach(function (row) {
      if (row._yn) return; row._yn = 1;
      on(row, 'click', function (e) { var b = e.target.closest('[data-yn-reel-open]'); if (!b) return; e.preventDefault(); getVbox()._open(b.dataset.ynReelOpen, b); });
      if (!('IntersectionObserver' in window)) return;
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        $$('video', row).forEach(function (v) { v.muted = true; if (vis && !reduce) { v.preload = 'metadata'; var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
      }, { threshold: 0.1 }).observe(row);
    });
  }

  /* ---------- FAQ page: tabs, scroll spy, search ---------- */
  function initFaq(root) {
    $$('[data-yn-faq]', root).forEach(function (w) {
      if (w._yn) return; w._yn = 1;
      var tabs = $$('[data-yn-faq-tab]', w), cats = $$('[data-yn-faq-cat]', w), input = $('[data-yn-faq-search]', w), none = $('[data-yn-faq-none]', w), status = $('[data-yn-faq-status]', w);
      function setTab(id) { tabs.forEach(function (t) { var onT = t.getAttribute('href') === '#' + id; t.classList.toggle('is-on', onT); if (onT && t.scrollIntoView) t.parentNode.scrollTo({ left: t.offsetLeft - 20, behavior: 'smooth' }); }); }
      tabs.forEach(function (t) {
        on(t, 'click', function (e) {
          var c = $(t.getAttribute('href')); if (!c) return; e.preventDefault();
          window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - (mqMobile.matches ? 130 : 150), behavior: reduce ? 'auto' : 'smooth' });
          setTab(c.id); history.replaceState(null, '', t.getAttribute('href'));
        });
      });
      on(window, 'scroll', raf(function () { var cur = null; cats.forEach(function (c) { if (!c.hidden && c.getBoundingClientRect().top < 200) cur = c; }); if (cur && cur.id) setTab(cur.id); }), { passive: true });
      if (input) {
        var t;
        on(input, 'input', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            var q = input.value.trim().toLowerCase(), hits = 0;
            cats.forEach(function (c) {
              var vis = 0;
              $$('[data-yn-faq-q]', c).forEach(function (d) {
                var m = !q || d.textContent.toLowerCase().indexOf(q) > -1;
                d.hidden = !m; if (m) { vis++; hits++; }
                d.open = !!(q && m);
              });
              c.hidden = !vis;
            });
            if (none) none.hidden = hits > 0;
            if (status) status.textContent = q ? hits + ' question' + (hits === 1 ? '' : 's') + ' found' : '';
          }, 120);
        });
      }
      if (location.hash) { var c0 = $(location.hash, w); if (c0) setTab(c0.id); }
    });
  }

  /* ---------- tabs with hash (policies) ---------- */
  function initTabs(root) {
    $$('[data-yn-tabs]', root).forEach(function (w) {
      if (w._yn) return; w._yn = 1;
      var tabs = $$('[data-yn-tab]', w), panels = $$('[data-yn-panel]', w);
      if (!tabs.length) { panels.forEach(function (p) { p.removeAttribute('data-hidden'); }); return; }
      function show(id, scroll) {
        var target = panels.filter(function (p) { return p.id === id; })[0]; if (!target) return false;
        panels.forEach(function (p) { if (p === target) p.removeAttribute('data-hidden'); else p.setAttribute('data-hidden', ''); });
        tabs.forEach(function (t) { var a = t.getAttribute('href') === '#' + id; t.classList.toggle('is-on', a); t.setAttribute('aria-selected', a ? 'true' : 'false'); });
        if (scroll) { var top = w.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: top, behavior: 'auto' }); }
        return true;
      }
      tabs.forEach(function (t) { on(t, 'click', function (e) { e.preventDefault(); var id = t.getAttribute('href').slice(1); show(id); history.replaceState(null, '', '#' + id); }); });
      function fromHash() { if (location.hash) show(decodeURIComponent(location.hash.slice(1)), true); }
      on(window, 'hashchange', fromHash); fromHash();
    });
  }

  /* ---------- sign-up popup ---------- */
  function initPopup(root) {
    $$('[data-yn-popup]', root).forEach(function (p) {
      if (p._yn) return; p._yn = 1;
      var key = p.dataset.key || 'yn_pop';
      function seen() { try { return localStorage.getItem(key); } catch (e) { return null; } }
      function mark() { try { localStorage.setItem(key, '1'); } catch (e) {} }
      function show() { p.hidden = false; requestAnimationFrame(function () { p.classList.add('is-on'); }); var x = $('[data-yn-pop-close]', p); if (x) x.focus(); }
      function hide() { p.classList.remove('is-on'); setTimeout(function () { p.hidden = true; }, 300); mark(); }
      on(p, 'click', function (e) { if (e.target === p || e.target.closest('[data-yn-pop-close]')) hide(); });
      on(doc, 'keydown', function (e) { if (e.key === 'Escape' && !p.hidden) hide(); });
      on($('form', p), 'submit', mark);
      if ($('.yn-form-ok,.yn-form-err', p)) { show(); return; }
      if (p.hasAttribute('data-preview')) { show(); return; }
      if (seen()) return;
      setTimeout(function () { if (!seen()) show(); }, (parseFloat(p.dataset.delay) || 0) * 1000);
    });
  }

  /* ---------- image lightbox ---------- */
  var lbx = null;
  function lightbox(srcs, alts, start, from) {
    if (!lbx) {
      lbx = doc.createElement('div'); lbx.className = 'yn yn-lbx'; lbx.hidden = true;
      lbx.setAttribute('role', 'dialog'); lbx.setAttribute('aria-modal', 'true'); lbx.setAttribute('aria-label', 'Product images');
      var ar = function (d) { return '<svg class="yn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
      lbx.innerHTML = '<img alt=""><button type="button" class="yn-lbx__p" aria-label="Previous image">' + ar('M15 5l-7 7 7 7') + '</button><button type="button" class="yn-lbx__n" aria-label="Next image">' + ar('M9 5l7 7-7 7') + '</button><button type="button" class="yn-lbx__x" aria-label="Close">' + ar('M6 6l12 12M18 6L6 18') + '</button><span class="yn-lbx__c"></span>';
      doc.body.appendChild(lbx);
      var sx = null;
      on(lbx, 'click', function (e) {
        if (e.target.closest('.yn-lbx__p')) return lbx._go(lbx._i - 1);
        if (e.target.closest('.yn-lbx__n')) return lbx._go(lbx._i + 1);
        if (e.target === lbx || e.target.closest('.yn-lbx__x')) lbx._close();
      });
      on(lbx, 'touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      on(lbx, 'touchend', function (e) { if (sx === null) return; var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 40) lbx._go(lbx._i + (d < 0 ? 1 : -1)); sx = null; });
      on(doc, 'keydown', function (e) { if (lbx.hidden) return; if (e.key === 'Escape') lbx._close(); if (e.key === 'ArrowRight') lbx._go(lbx._i + 1); if (e.key === 'ArrowLeft') lbx._go(lbx._i - 1); });
      lbx._close = function () { lbx.hidden = true; html.classList.remove('yn-lock'); if (lbx._from) lbx._from.focus(); };
    }
    lbx._go = function (i) { lbx._i = (i + srcs.length) % srcs.length; var im = $('img', lbx); im.src = srcs[lbx._i]; im.alt = alts[lbx._i] || ''; $('.yn-lbx__c', lbx).textContent = (lbx._i + 1) + ' / ' + srcs.length; };
    lbx._from = from; lbx.hidden = false; html.classList.add('yn-lock'); lbx._go(start); $('.yn-lbx__x', lbx).focus();
  }
  function largest(img) {
    var ss = img.getAttribute('srcset'); if (!ss) return img.currentSrc || img.src;
    var best = null, bw = 0;
    ss.split(',').forEach(function (p) { var a = p.trim().split(/\s+/); var w = parseInt(a[1], 10) || 0; if (w > bw) { bw = w; best = a[0]; } });
    return best || img.src;
  }

  /* ---------- product ---------- */
  function initProduct(root) {
    $$('[data-yn-product]', root).forEach(function (sec) {
      if (sec._yn) return; sec._yn = 1;
      var data = {}; try { data = JSON.parse($('[data-yn-product-json]', sec).textContent); } catch (e) {}
      var form = doc.getElementById(sec.dataset.form);
      var idInput = form && $('[data-yn-variant-input]', form), qtyInput = form && $('[data-yn-qty-input]', form);
      var atc = form && $('[data-yn-atc]', form), atcText = atc && $('[data-yn-atc-text]', atc), errBox = form && $('[data-yn-form-error]', form);
      var priceEl = $('[data-yn-price]', sec), cmpEl = $('[data-yn-compare]', sec), saveEl = $('[data-yn-save]', sec), perEl = $('[data-yn-per]', sec), soldBadge = $('[data-yn-soldout-badge]', sec);
      var stock = $('[data-yn-stock]', sec), sticky = $('[data-yn-sticky]', sec), stickyLabel = sticky && $('[data-yn-sticky-label]', sticky), stickyBtn = sticky && $('[data-yn-sticky-buy]', sticky);
      var nightsUnit = parseFloat(sec.dataset.nightsUnit) || 30;
      var variants = data.variants || [];
      var current = variants.filter(function (v) { return idInput && String(v.id) === idInput.value; })[0] || variants[0];

      function setAvailable(ok) {
        if (atc) { atc.disabled = !ok; if (atcText) atcText.textContent = ok ? atc.dataset.labelAdd : atc.dataset.labelSold; }
        if (stickyBtn) stickyBtn.disabled = !ok;
        if (soldBadge) soldBadge.hidden = ok;
      }
      function setStock(v) {
        if (!stock || !v) return;
        var txt = $('[data-yn-stock-text]', stock), dot = $('.yn-stock__dot', stock), th = parseInt(stock.dataset.threshold, 10) || 0;
        var s = !v.available ? stock.dataset.out : (v.inv !== null && v.inv > 0 && v.inv <= th && stock.dataset.low ? stock.dataset.low.replace('[count]', v.inv) : stock.dataset.in);
        if (txt) txt.textContent = s; if (dot) dot.classList.toggle('is-out', !v.available);
      }
      function setPrice(total, full, savePct, nights, label) {
        if (priceEl) priceEl.textContent = Y.formatMoney(total, true);
        if (cmpEl) { cmpEl.hidden = !(full > total); cmpEl.textContent = Y.formatMoney(full, true); }
        if (saveEl) { saveEl.hidden = !(savePct > 0); saveEl.textContent = (saveEl.dataset.template || 'Save [percent]%').replace('[percent]', savePct); }
        if (perEl) { perEl.textContent = (perEl.dataset.template || '[price] per night').replace('[price]', Y.formatMoney(total / (nights || nightsUnit), false)); }
        if (stickyLabel) stickyLabel.textContent = (label ? label + ' · ' : '') + Y.formatMoney(total, true);
      }
      function mediaTo(mediaId) {
        if (!mediaId) return;
        var list = $('[data-yn-gal-list]', sec), item = list && $('[data-media-id="' + mediaId + '"]', list);
        if (!item) return;
        var idx = $$('.yn-gal__item', list).indexOf(item);
        if (mqMobile.matches) galGo(idx);
      }

      /* tiers */
      var tierInputs = $$('input[name^="yn-tier-"]', sec);
      function applyTier() {
        var t = tierInputs.filter(function (r) { return r.checked; })[0] || tierInputs[0]; if (!t) return;
        if (idInput) idInput.value = t.dataset.variant;
        if (qtyInput) qtyInput.value = t.dataset.qty;
        var total = +t.dataset.total, full = +t.dataset.full, save = +t.dataset.save, per = +t.dataset.perNight;
        var nights = per > 0 ? total / per : nightsUnit;
        setPrice(total, full, save, nights, t.dataset.label);
        var v = variants.filter(function (x) { return String(x.id) === t.dataset.variant; })[0];
        setAvailable(t.dataset.available === 'true'); setStock(v);
        if (v) mediaTo(v.media);
      }
      tierInputs.forEach(function (r) { on(r, 'change', applyTier); });

      /* option pills */
      var optInputs = $$('[data-yn-option]', sec);
      function applyOptions() {
        var sel = [];
        optInputs.forEach(function (r) { if (r.checked) sel[+r.dataset.ynOption] = r.value; });
        var v = variants.filter(function (x) { return x.options.every(function (o, i) { return sel[i] === undefined || sel[i] === o; }); })[0];
        // mark unavailable values
        optInputs.forEach(function (r) {
          var idx = +r.dataset.ynOption, test = sel.slice(); test[idx] = r.value;
          var exists = variants.some(function (x) { return x.available && x.options.every(function (o, i) { return test[i] === undefined || test[i] === o; }); });
          r.closest('.yn-vpick__val').classList.toggle('is-unavailable', !exists);
        });
        if (!v) { setAvailable(false); return; }
        current = v;
        if (idInput) idInput.value = v.id;
        var save = v.compare > v.price ? Math.round((v.compare - v.price) * 100 / v.compare) : 0;
        var q = qtyInput ? (+qtyInput.value || 1) : 1;
        setPrice(v.price * q, (v.compare > v.price ? v.compare : 0) * q, save, nightsUnit * q, '');
        setAvailable(v.available); setStock(v); mediaTo(v.media);
        if (!Y.designMode && history.replaceState) { var u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(null, '', u.toString()); }
      }
      optInputs.forEach(function (r) { on(r, 'change', applyOptions); });

      /* quantity selector */
      var qtyVis = $('[data-yn-qty-visible]', sec);
      function syncQty(n) { n = Math.max(1, parseInt(n, 10) || 1); if (qtyVis) qtyVis.value = n; if (qtyInput) qtyInput.value = n; if (!tierInputs.length && current) { var s = current.compare > current.price ? Math.round((current.compare - current.price) * 100 / current.compare) : 0; setPrice(current.price * n, (current.compare > current.price ? current.compare : 0) * n, s, nightsUnit * n, ''); } }
      $$('[data-yn-qty]', sec).forEach(function (b) { on(b, 'click', function () { syncQty((+qtyVis.value || 1) + (+b.dataset.ynQty)); }); });
      on(qtyVis, 'change', function () { syncQty(qtyVis.value); });

      if (tierInputs.length && data.useTiers) applyTier();
      else if (optInputs.length) applyOptions();

      /* add to cart */
      on(form, 'submit', function (e) {
        e.preventDefault();
        if (!atc || atc.disabled) return;
        if (errBox) errBox.hidden = true;
        atc.classList.add('is-loading'); atc.setAttribute('aria-busy', 'true');
        var fd = new FormData(form);
        var drawer = doc.querySelector('cart-drawer');
        var sections = drawer ? 'cart-drawer,cart-icon-bubble' : 'cart-icon-bubble';
        fd.append('sections', sections); fd.append('sections_url', location.pathname);
        fetch(Y.cartAddUrl || '/cart/add', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/javascript' }, body: fd })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.status) { throw new Error(res.description || res.message || 'Could not add to cart'); }
            doc.dispatchEvent(new CustomEvent('yn:cart:added', { detail: res }));
            doc.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
            var bubble = doc.getElementById('cart-icon-bubble');
            if (drawer && typeof drawer.renderContents === 'function' && res.sections) {
              try { drawer.classList.remove('is-empty'); drawer.renderContents(res); return; } catch (err) { if (window.console) console.warn('YUNA: cart drawer render failed', err); }
            }
            if (bubble && res.sections && res.sections['cart-icon-bubble']) {
              var tmp = doc.createElement('div'); tmp.innerHTML = res.sections['cart-icon-bubble'];
              var inner = tmp.querySelector('.shopify-section') || tmp; bubble.innerHTML = inner.innerHTML;
            }
            if (!drawer) window.location.href = Y.cartUrl || '/cart';
          })
          .catch(function (err) { if (errBox) { errBox.textContent = err.message; errBox.hidden = false; } })
          .finally(function () { atc.classList.remove('is-loading'); atc.removeAttribute('aria-busy'); });
      });

      /* sticky add to cart */
      if (sticky && atc && 'IntersectionObserver' in window) {
        var past = false, footVis = false;
        function upd() { var onS = past && !footVis; sticky.classList.toggle('is-on', onS); sticky.setAttribute('aria-hidden', onS ? 'false' : 'true'); }
        new IntersectionObserver(function (es) { past = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; upd(); }).observe(atc);
        var ft = doc.querySelector('.yn-ftr') || doc.querySelector('footer');
        if (ft) new IntersectionObserver(function (es) { footVis = es[0].isIntersecting; upd(); }).observe(ft);
        on(stickyBtn, 'click', function () { if (form.requestSubmit) form.requestSubmit(); else atc.click(); });
      }

      /* gallery */
      var list = $('[data-yn-gal-list]', sec), strip = $('[data-yn-gal-strip]', sec), cur = 0;
      function mark(i) { cur = i; if (!strip) return; $$('.yn-gal__th', strip).forEach(function (t, k) { t.classList.toggle('is-on', k === i); }); var th = strip.children[i]; if (th) strip.scrollTo({ left: th.offsetLeft - strip.clientWidth / 2 + th.clientWidth / 2, behavior: 'smooth' }); }
      function galGo(i) { if (!list) return; var items = $$('.yn-gal__item', list); i = Math.max(0, Math.min(items.length - 1, i)); list.scrollTo({ left: items[i].offsetLeft - list.offsetLeft, behavior: reduce ? 'auto' : 'smooth' }); mark(i); }
      if (list) {
        $$('[data-yn-gal-go]', sec).forEach(function (b) { on(b, 'click', function () { galGo(+b.dataset.ynGalGo); }); });
        on($('[data-yn-gal-prev]', sec), 'click', function () { galGo(cur - 1); });
        on($('[data-yn-gal-next]', sec), 'click', function () { galGo(cur + 1); });
        var st; on(list, 'scroll', function () { clearTimeout(st); st = setTimeout(function () { if (!mqMobile.matches) return; var i = Math.round(list.scrollLeft / list.clientWidth); if (i !== cur) mark(i); }, 60); }, { passive: true });
        on(list, 'click', function (e) {
          var z = e.target.closest('[data-yn-zoom]'); if (!z) return;
          var imgs = $$('[data-yn-zoom] img', list);
          lightbox(imgs.map(largest), imgs.map(function (i) { return i.alt; }), imgs.indexOf($('img', z)), z);
        });
      }
    });
  }

  /* ---------- smooth anchor scroll (e.g. #offer) ---------- */
  on(doc, 'click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.hasAttribute('data-yn-tab') || a.hasAttribute('data-yn-faq-tab')) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var t; try { t = doc.querySelector(id); } catch (err) { return; } if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 110, behavior: reduce ? 'auto' : 'smooth' });
  });

  function init(root) {
    root = root || doc;
    initReveal(root); initRotator(root); initHeader(root); initHero(root); initLoops(root); initScrollers(root);
    initRings(root); initTimelines(root); initReels(root); initFaq(root); initTabs(root); initPopup(root); initProduct(root);
  }
  if (doc.readyState === 'loading') on(doc, 'DOMContentLoaded', function () { init(); }); else init();
  on(window, 'load', function () { initLoops(doc); });
  on(doc, 'shopify:section:load', function (e) { init(e.target); });
  on(doc, 'shopify:block:select', function (e) {
    var hero = e.target.closest('[data-yn-hero]');
    if (hero && hero._ynGo) { var idx = $$('.yn-hero__slide', hero).indexOf(e.target); if (idx > -1) hero._ynGo(idx); }
  });
  Y.init = init;
})();
