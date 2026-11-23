/* Blue Collar Energy — motion. Concept by Code Bunny.
   Plain JavaScript, no libraries. Rules:
   - Nothing that is already on screen is ever hidden. Entrances only apply to content that is
     below the fold, or that sits behind the loader / page curtain while it is down.
   - Every cover has a hard time limit, so a slow network never leaves the page blank.
   - Scroll work runs in one requestAnimationFrame per frame and only for things near the screen.
   - prefers-reduced-motion turns all of it off. */
(() => {
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  if (reduce) { root.classList.remove('is-loading', 'pt-in'); return; }

  /* ---------- Covers: first-visit loader and page curtain ---------- */
  const covered = () => root.classList.contains('is-loading') || root.classList.contains('pt-in');
  const waiting = [];
  const whenUncovered = (fn) => { if (covered()) waiting.push(fn); else fn(); };
  const uncover = () => { root.classList.remove('is-loading', 'pt-in'); while (waiting.length) waiting.shift()(); };
  const NAMES = { 'index.html': 'Home', '': 'Home', 'payment-options.html': 'Ways to pay', 'services.html': 'Services',
    'process.html': 'How it works', 'about.html': 'About the crew', 'quote.html': 'Your free quote', 'preview-pack.html': 'Preview pack' };
  const nameFor = (url) => NAMES[url.pathname.split('/').pop()] || 'Blue Collar';

  // First visit: the battery charges with real page progress (images + fonts), 1.4s to 3s.
  const loader = $('[data-loader]');
  if (loader && root.classList.contains('is-loading')) {
    const cells = $$('.loader__cells i', loader), num = $('[data-loader-num]', loader), lab = $('[data-loader-label]', loader);
    const N = cells.length, t0 = performance.now(), MIN = 1400, MAX = 3000;
    const imgs = [...d.images].filter(i => i.loading !== 'lazy' && !loader.contains(i));
    let fonts = false, loaded = false, lit = 0, last = 0, done = false;
    d.fonts && d.fonts.ready.then(() => { fonts = true; });
    addEventListener('load', () => { loaded = true; });
    const frac = () => loaded ? 1 : (imgs.filter(i => i.complete).length + (fonts ? 1 : 0)) / (imgs.length + 1);
    const finish = () => {
      if (done) return; done = true;
      cells.forEach(c => c.classList.add('on')); num.textContent = '100'; lab.textContent = 'Fully charged';
      loader.classList.add('is-charged');
      try { sessionStorage.setItem('bce-boot', '1'); } catch (e) {}
      setTimeout(() => {
        loader.classList.add('is-done');
        setTimeout(uncover, 320);
        setTimeout(() => loader.remove(), 1500);
      }, 380);
    };
    const tick = (now) => {
      if (done) return;
      const t = now - t0, want = Math.min(N, Math.ceil(Math.min(t / MIN, 0.15 + 0.85 * frac()) * N));
      if (want > lit && now - last > 110) { cells[lit].classList.add('on'); lit++; last = now; num.textContent = Math.round(lit / N * 100); loader.style.setProperty('--p', lit / N); }
      if ((lit >= N && t >= MIN) || t >= MAX) return finish();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else if (loader) loader.remove();

  // Arriving from another page (or a reload): the curtain is down, lift it as soon as the page is usable.
  const pt = $('[data-pt]'), ptName = $('[data-pt-name]');
  if (root.classList.contains('pt-in')) {
    if (ptName) ptName.textContent = nameFor(location);
    const t0 = performance.now();
    const lift = () => {
      if (!root.classList.contains('pt-in')) return;
      setTimeout(() => {
        root.classList.add('pt-leave');
        uncover();
        setTimeout(() => root.classList.remove('pt-leave'), 1200);
      }, Math.max(0, 240 - (performance.now() - t0)));
    };
    Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(lift);
    setTimeout(lift, 1800);
  }

  // Leaving: the curtain sweeps up with the next page's name, then we navigate.
  d.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    let url; try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname) || url.pathname === location.pathname) return;
    e.preventDefault();
    if (ptName) ptName.textContent = nameFor(url);
    root.classList.add('pt-out');
    setTimeout(() => { location.href = url.href; }, 560);
  });
  const fetched = new Set();
  const prefetch = (e) => {
    const a = e.target.closest && e.target.closest('a[href$=".html"]');
    if (!a) return;
    let url; try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.pathname === location.pathname || fetched.has(url.pathname)) return;
    fetched.add(url.pathname);
    const l = d.createElement('link'); l.rel = 'prefetch'; l.href = url.pathname; d.head.appendChild(l);
  };
  d.addEventListener('pointerover', prefetch, { passive: true });
  d.addEventListener('touchstart', prefetch, { passive: true });
  addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('pt-out', 'pt-in', 'pt-leave', 'is-loading'); });
  if (pt && !covered()) pt.classList.add('is-idle');

  /* ---------- Helpers ---------- */
  const below = (el) => el.getBoundingClientRect().top > innerHeight * 0.96;   // not painted on screen yet
  const mayHide = (el) => covered() || below(el);
  const onView = (el, fn, margin = '0px 0px -1px 0px') => {
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
    whenUncovered(() => io.observe(el));
  };

  /* ---------- Headlines: words rise in from a mask ---------- */
  $$('.d-hero, .d-xl, .d-l, .quote, .ftr__line').forEach((el) => {
    if (!mayHide(el)) return;
    let i = 0;
    const wrap = (inner) => { const w = d.createElement('span'); w.className = 'rise-w'; inner.style.setProperty('--d', (i++ * 0.055).toFixed(3) + 's'); w.appendChild(inner); return w; };
    (function walk(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            const s = d.createElement('span'); s.textContent = part; frag.appendChild(wrap(s));
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName === 'EM') {          // the serif phrase rises as one piece
          const s = d.createElement('span'), w = wrap(s);
          n.replaceWith(w); s.appendChild(n);
        } else if (n.nodeType === 1 && !n.classList.contains('sr-only') && !n.classList.contains('pill-img')) walk(n);
      });
    })(el);
    el.classList.add('rise');
    onView(el, () => el.classList.add('is-risen'), '0px 0px -4% 0px');
  });

  /* ---------- Reveal on scroll, staggered inside groups ---------- */
  const GROUPS = '.facts, .feats, .stats ul, .bento, .calc__ways, .milestones, .cta__facts, .cards, .pillars, .kv, .leads, .towns, .opts, .team, .faq, .checks, .bat__loads, .psteps, .ftr__top, .jump, .ticks, .day__stats, .pp-stats, .vs, .statcards, .dark3, .leaders, .track__rows, .jstep__list, .explore__dots, .wait__legend';
  const SINGLES = '.head .label, .head__note, .photo-card, .calc, .payback__sum, .payback__chart, .map, .who__photo, .who__text > .label, .who__q, .split__media, .phero__media, .chart, .match, .vt-wrap, .sun, .area__text > p, .hero .kicker, .hero__lede, .hero__ask, .phero__crumb, .phero__text > p, .phero__text > .btns, .phero__aside, .cta .kicker, .cta__sub, .cta .btns, .step, .day__scene, .day__side > *, .bat__out, .wiz__card, .est, .contact-card, .split__body > p, .split__body > .btn, .story__body, .quote-q, .more, .statement + .feats, .crumb, .hero__row .btns, .explore__card, .explore__lede, .bat-head, .track, .quiet__text > *, .ask-card, .qa__side > .label, .story2__body > p, .wait';
  const reveal = (el, delay) => {
    if (el.classList.contains('rv') || el.closest('[hidden]') || !mayHide(el)) return;   // hidden panels (e.g. the quote thank-you) are left alone
    el.classList.add('rv'); if (delay) el.style.setProperty('--rd', delay + 's');
    onView(el, () => el.classList.add('is-in'));
  };
  $$(GROUPS).forEach(g => [...g.children].forEach((c, i) => reveal(c, Math.min(i, 8) * 0.07)));
  $$(SINGLES).forEach(el => reveal(el, el.closest('.hero, .phero, .cta') ? 0.25 : 0));
  // hero copy follows the headline when the page opens behind a cover
  [['.hero__lede', .35], ['.hero__ask', .45], ['.hero__row .btns', .45], ['.hero .kicker', .05], ['.crumb', .05]].forEach(([s, t]) => { const el = $(s); if (el && el.classList.contains('rv')) el.style.setProperty('--rd', t + 's'); });

  /* ---------- Photos open out of a clipped frame ---------- */
  $$('.split__media, .story2__media, .mosaic figure, .journey__media, .explore__stage, .who__photo').forEach((el) => {
    if (!mayHide(el) || el.classList.contains('rv')) return;
    el.classList.add('wipe');
    onView(el, () => el.classList.add('is-in'), '0px 0px -6% 0px');
  });

  /* ---------- Counters ---------- */
  const fmtNum = (v, dec) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  $$('.milestones b, .stats b, .payback__big, .pp-stats dd, .photo-card b, .bat__hrs, .statcards b').forEach((el) => {
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!tn || !mayHide(el)) return;
    const m = tn.textContent.match(/^(\D*)([\d,]*\.?\d+)(.*)$/s);
    if (!m) return;
    const to = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length;
    if (!to) return;
    tn.textContent = m[1] + fmtNum(0, dec) + m[3];
    onView(el, () => {
      const t0 = performance.now(), dur = 1400;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 4);
        tn.textContent = m[1] + fmtNum(to * k, dec) + m[3];
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, '0px 0px -12% 0px');
  });

  /* ---------- Payback bars grow out of the zero line ---------- */
  $$('.bars').forEach((b) => {
    if (!mayHide(b)) return;
    [...b.children].forEach((li, i) => li.style.setProperty('--bd', (i * 0.035).toFixed(3) + 's'));
    b.classList.add('pre');
    onView(b, () => b.classList.add('is-in'), '0px 0px -15% 0px');
  });

  /* ---------- Scroll-driven effects, on the shared frame loop (see BCE in site.js) ----------
     Geometry is cached in onMeasure; onFrame only does arithmetic and style writes. */
  const BCE = window.BCE;

  // Smooth wheel scrolling: mouse and trackpad only, never touch. Keyboard, scrollbar dragging,
  // find-in-page and anchor jumps keep working natively; we simply follow the real position.
  const smooth = (() => {
    if (!fine || !BCE || window.BCE_NO_SMOOTH) return null;
    let target = scrollY, cur = scrollY, raf = 0, active = false;
    const max = () => root.scrollHeight - innerHeight;
    const go = (y) => { scrollTo({ top: y, behavior: 'instant' }); };
    const tick = () => {
      cur += (target - cur) * 0.11;
      const step = (target - cur) * 0.11;
      cur += step;
      if (Math.abs(target - cur) < 0.4) { cur = target; active = false; }
      go(cur); BCE.flush();
      // a glide that runs into the top or bottom carries its speed into a small bounce
      // (sized by how far past the edge you scrolled; fires just before the glide settles)
      if (landing && (landing > 0 ? cur <= 24 : cur >= max() - 24)) { kick(landing * 0.035); landing = 0; }
      if (active) raf = requestAnimationFrame(tick); else raf = 0;
    };
    const start = () => { if (!active) { active = true; raf = requestAnimationFrame(tick); } };
    const stop = () => { if (active) { active = false; cancelAnimationFrame(raf); } target = cur = scrollY; landing = 0; };
    const canScroll = (el, dy) => {
      for (; el && el !== d.body && el !== root; el = el.parentElement) {
        if (el.scrollHeight <= el.clientHeight + 1) continue;
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return true;
      }
      return false;
    };
    /* Edge bounce: pushing past the top (or bottom) pulls the page with growing resistance, then a
       spring brings it back with a small overshoot, like a phone's rubber-band scroll. Only the
       page layers move (top bar, header, main, footer), via the `translate` property. */
    const layers = $$('.topbar, .hdr, main, .ftr');
    let pull = 0, vel = 0, sraf = 0, lastWheel = 0;
    const MAXPULL = 150;
    let landing = 0;
    const kick = (v) => { vel = clamp(v, -14, 14); lastWheel = 0; if (!sraf) sraf = requestAnimationFrame(spring); };
    const paint = () => { const v = Math.abs(pull) < 0.3 ? '' : `0 ${pull.toFixed(1)}px`; layers.forEach(l => { l.style.translate = v; }); };
    const spring = (now) => {
      if (now - lastWheel < 90) { sraf = requestAnimationFrame(spring); return; }   // still being pushed
      vel = vel * 0.63 - pull * 0.105;   // ~8px overshoot, settles in ~0.4s
      pull += vel;
      if (Math.abs(pull) < 0.3 && Math.abs(vel) < 0.3) { pull = vel = 0; paint(); sraf = 0; return; }
      paint(); sraf = requestAnimationFrame(spring);
    };
    const stretch = (over) => {                       // over > 0: past the top, < 0: past the bottom
      lastWheel = performance.now(); vel = 0;
      const k = 1 - Math.min(0.92, Math.abs(pull) / MAXPULL);    // resistance grows as it stretches
      pull = clamp(pull + over * 0.45 * k, -MAXPULL, MAXPULL);
      paint();
      if (!sraf) sraf = requestAnimationFrame(spring);
    };
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || covered() || d.body.classList.contains('menu-open')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || canScroll(e.target, e.deltaY)) return;
      e.preventDefault();
      if (!active) target = cur = scrollY;
      const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      const want = target + dy, m = max();
      if (want < 0 && scrollY <= 1) { stretch(-want); target = 0; return; }
      if (want > m && scrollY >= m - 1) { stretch(m - want); target = m; return; }
      landing = want < 0 ? Math.min(-want, 400) : want > m ? -Math.min(want - m, 400) : 0;   // glide will hit an edge
      target = clamp(want, 0, m);
      start();
    }, { passive: false });
    addEventListener('pointerdown', stop);
    addEventListener('keydown', (e) => { if (!e.ctrlKey && !e.metaKey) stop(); });
    addEventListener('scroll', () => { if (!active) target = cur = scrollY; }, { passive: true });
    return { to(y) { if (!active) target = cur = scrollY; target = clamp(y, 0, max()); start(); } };
  })();
  window.BCE_SCROLL = smooth;

  // In-page links glide to their target, clearing the header
  d.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const t = d.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    const y = (window.BCE ? window.BCE.docTop(t) : t.getBoundingClientRect().top + scrollY) - 88;
    if (smooth) smooth.to(y); else scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  if (BCE) {
    // Statement lights up word by word
    $$('.statement').forEach((el) => {
      (function split(node) {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = d.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
              const w = d.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && !n.classList.contains('pill-img')) split(n);
        });
      })(el);
      el.classList.add('is-words');
      const words = $$('.w', el), op = words.map(() => -1);
      let g = null;
      BCE.onMeasure((sy) => { g = { top: BCE.docTop(el, sy), h: el.offsetHeight }; });
      BCE.onFrame((y, vh) => {
        if (!g) return;
        const top = g.top - y;
        if (top + g.h < -200 || top > vh + 200) return;
        const lit = clamp((vh * 0.82 - top) / (g.h + vh * 0.3), 0, 1) * words.length;
        words.forEach((w, i) => { const o = Math.round(clamp(lit - i + 1, 0.16, 1) * 20) / 20; if (o !== op[i]) { op[i] = o; w.style.opacity = o; } });
      });
    });

    // Gentle image parallax (the `translate` property composes with hover and entrance scale)
    const plx = $$('.hero__bg, .photo-card img, .who__photo img, .cta__bg, .split__media img, .story2__a').map((img) => {
      img.classList.add('plx');
      return { img, box: img.closest('.hero, .cta') || img.parentElement, amt: img.classList.contains('hero__bg') || img.classList.contains('cta__bg') ? 8 : 5, g: null, last: '' };
    });
    BCE.onMeasure((sy) => plx.forEach(p => { p.g = { top: BCE.docTop(p.box, sy), h: p.box.offsetHeight }; }));
    BCE.onFrame((y, vh) => plx.forEach((p) => {
      if (!p.g) return;
      const top = p.g.top - y;
      if (top + p.g.h < -100 || top > vh + 100) return;
      const v = `0 ${(((top + p.g.h / 2 - vh / 2) / (vh / 2 + p.g.h / 2)) * -p.amt).toFixed(2)}%`;
      if (v !== p.last) { p.last = v; p.img.style.translate = v; }
    }));

    // Big sections rise and settle into place as they arrive, so one flows into the next
    const panels = $$('.panel, .sec--ink, .sec--ink2, .cta, .calc, .day__card, .explore__stage, .wait, .track').filter(el => !el.closest('.hero'))
      .map((el) => { el.classList.add('flow'); return { el, g: null, q: -1 }; });
    BCE.onMeasure((sy) => panels.forEach(p => { p.el.style.scale = ''; p.el.style.translate = ''; p.g = { top: BCE.docTop(p.el, sy) }; p.q = -1; }));
    BCE.onFrame((y, vh) => panels.forEach((p) => {
      if (!p.g) return;
      const t = clamp((vh - (p.g.top - y)) / (vh * 0.55), 0, 1);
      const q = Math.round((1 - Math.pow(1 - t, 3)) * 400) / 400;
      if (q === p.q) return; p.q = q;
      const big = p.el.classList.contains('panel') || p.el.classList.contains('cta') || p.el.classList.contains('sec--ink') || p.el.classList.contains('sec--ink2');
      p.el.style.scale = q >= 1 ? '' : (1 - (big ? 0.045 : 0.06) * (1 - q)).toFixed(4);
      p.el.style.translate = q >= 1 ? '' : `0 ${((1 - q) * (big ? 48 : 36)).toFixed(1)}px`;
    }));

    // Process cards: each one settles back as the next stacks over it (sticky top: 92px)
    const stepEls = $$('.steps .step');
    if (stepEls.length) {
      let sg = null; const last = stepEls.map(() => '');
      BCE.onMeasure((sy) => {
        if (innerWidth < 900) { sg = null; stepEls.forEach(s => { s.style.scale = ''; s.style.removeProperty('--dim'); }); return; }
        const ol = stepEls[0].parentElement, gap = parseFloat(getComputedStyle(ol).rowGap) || 0;
        let top = BCE.docTop(ol, sy);
        sg = stepEls.map(s => { const g = { top, h: s.offsetHeight }; top += g.h + gap; return g; });
      });
      BCE.onFrame((y) => {
        if (!sg) return;
        sg.forEach((g, i) => {
          const next = sg[i + 1]; if (!next) return;
          const stuckTop = Math.max(92, g.top - y);
          const p = clamp((stuckTop + g.h - (next.top - y)) / g.h, 0, 1);
          const v = (1 - 0.06 * p).toFixed(3);
          if (v === last[i]) return; last[i] = v;
          stepEls[i].style.scale = v; stepEls[i].style.setProperty('--dim', (p * 0.35).toFixed(3));
        });
      });
    }

    // Header tucks away on the way down and returns on the way up
    const hdr = $('[data-hdr]');
    let lastY = scrollY, tucked = false;
    BCE.onFrame((y) => {
      const t = y > lastY + 1 && y > 700 && !d.body.classList.contains('menu-open') ? true : y < lastY - 1 || y <= 700 ? false : tucked;
      lastY = y;
      if (hdr && t !== tucked) { tucked = t; hdr.classList.toggle('is-tucked', t); }
    });

    // Word bands: a compositor animation that speeds up while you scroll (no per-frame style writes)
    const bands = $$('.marquee__track').map(row => ({ row, anim: null, rate: 1 }));
    let vel = 0, ly = scrollY;
    BCE.onFrame((y) => {
      vel += (Math.min(Math.abs(y - ly), 160) * 0.05 - vel) * 0.2; ly = y;
      bands.forEach((b) => {
        if (!b.anim) b.anim = b.row.getAnimations ? b.row.getAnimations()[0] : null;
        if (!b.anim) return;
        const r = Math.round((1 + vel) * 20) / 20;
        if (r !== b.rate) { b.rate = r; b.anim.playbackRate = r; }
      });
      if (vel > 0.05) BCE.request();        // keep easing back to cruising speed after scrolling stops
    });

    BCE.measure();
  }

  /* ---------- Cards: a soft spotlight follows the pointer ---------- */
  if (fine) $$('.feats li, .svc, .pillar, .card, .cta__facts li, .calc__out, .opt, .step').forEach((c) => {
    c.classList.add('spot');
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  });

  /* ---------- Magnetic primary buttons ---------- */
  if (fine) $$('.btn--gold, .hdr__cta').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`; });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });

  /* ---------- Footer wordmark: letters rise in, then lift near the pointer ---------- */
  const word = $('.ftr__word');
  if (word) {
    const text = word.textContent; word.textContent = '';
    word.setAttribute('aria-label', text);
    const letters = [...text].map((ch, i) => { const s = d.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; s.style.setProperty('--ld', (i * 0.05).toFixed(2) + 's'); word.appendChild(s); return s; });
    word.classList.add('is-split');
    onView(word, () => {
      word.classList.add('is-in');
      if (!fine) return;
      setTimeout(() => {
        word.classList.add('is-live');
        let cx = [];
        word.addEventListener('pointerenter', () => { cx = letters.map(l => { const r = l.getBoundingClientRect(); return r.left + r.width / 2; }); });
        word.addEventListener('pointermove', (e) => letters.forEach((l, i) => { l.style.translate = `0 ${(-Math.max(0, 1 - Math.abs(e.clientX - (cx[i] || 0)) / 240) * 12).toFixed(1)}%`; }));
        word.addEventListener('pointerleave', () => letters.forEach(l => { l.style.translate = ''; }));
      }, 1400);
    }, '0px 0px -10% 0px');
  }
})();
