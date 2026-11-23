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
      }, Math.max(0, 380 - (performance.now() - t0)));
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
    setTimeout(() => { location.href = url.href; }, 720);
  });
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

  /* ---------- One scroll loop for everything position-driven ---------- */
  const scrollers = [];
  let queued = false;
  const runScroll = () => { queued = false; const vh = innerHeight; scrollers.forEach(f => f(vh)); };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(runScroll); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(runScroll), { passive: true });

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
    const words = $$('.w', el);
    let shown = -1;
    scrollers.push((vh) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const lit = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1) * words.length;
      const n = Math.round(lit * 4);
      if (n === shown) return; shown = n;
      words.forEach((w, i) => { w.style.opacity = clamp(lit - i + 1, 0.16, 1).toFixed(2); });
    });
  });

  // Gentle image parallax (uses the `translate` property so it composes with hover/entrance scale)
  $$('.hero__bg, .photo-card img, .who__photo img, .cta__bg, .split__media img, .phero__media img').forEach((img) => {
    img.classList.add('plx');
    const box = img.parentElement;
    const amt = img.classList.contains('hero__bg') ? 8 : 5;
    scrollers.push((vh) => {
      const r = box.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      img.style.translate = `0 ${(p * -amt).toFixed(2)}%`;
    });
  });

  // Process cards: each one settles back as the next stacks over it
  const steps = $$('.steps .step');
  if (steps.length) scrollers.push((vh) => {
    if (innerWidth < 900) return;
    steps.forEach((s, i) => {
      const next = steps[i + 1];
      if (!next) return;
      const a = s.getBoundingClientRect(), b = next.getBoundingClientRect();
      if (a.bottom < -50 || a.top > vh) return;
      const p = clamp((a.bottom - b.top) / a.height, 0, 1);
      s.style.scale = (1 - 0.06 * p).toFixed(4);
      s.style.setProperty('--dim', (p * 0.35).toFixed(3));
    });
  });

  // Header hides on the way down, returns on the way up
  const hdr = $('[data-hdr]');
  let lastY = scrollY;
  scrollers.push(() => {
    const y = scrollY;
    if (hdr && !d.body.classList.contains('menu-open')) hdr.classList.toggle('is-tucked', y > lastY && y > 700);
    lastY = y;
  });
  runScroll();

  /* ---------- Big word bands drift, faster while you scroll ---------- */
  $$('.marquee__track').forEach((row) => {
    row.style.animation = 'none';
    let x = 0, v = 0, ly = scrollY, half = row.scrollWidth / 2, on = false, raf = 0;
    addEventListener('resize', () => { half = row.scrollWidth / 2; });
    const tick = () => {
      const y = scrollY, dy = Math.abs(y - ly); ly = y;
      v += (Math.min(dy, 140) * 0.09 - v) * 0.1;
      x -= 0.55 + v;
      if (half && -x >= half) x += half;
      row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      if (on) raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(tick); }).observe(row.parentElement);
  });

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
        word.addEventListener('pointermove', (e) => letters.forEach((l) => { const r = l.getBoundingClientRect(), dx = Math.abs(e.clientX - (r.left + r.width / 2)); l.style.translate = `0 ${(-Math.max(0, 1 - dx / 240) * 12).toFixed(1)}%`; }));
        word.addEventListener('pointerleave', () => letters.forEach(l => { l.style.translate = ''; }));
      }, 1400);
    }, '0px 0px -10% 0px');
  }
})();
