/* Blue Collar Energy — core interactions. Concept by Code Bunny. */
(() => {
  const d = document, root = d.documentElement;
  root.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  /* ---------- Header: solid on scroll, hide on scroll down ---------- */
  const hdr = $('[data-hdr]'), mbar = $('.mbar'), concept = $('.concept');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 40);
      const goingDown = y > lastY && y > 640 && !d.body.classList.contains('menu-open');
      hdr.classList.toggle('is-hidden', goingDown);
    }
    if (mbar) mbar.classList.toggle('on', y > 480);
    if (concept) concept.classList.toggle('on', y > innerHeight * 0.85);
    lastY = y; ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Menu ---------- */
  const menuBtn = $('[data-menu-btn]');
  const setMenu = (open) => {
    d.body.classList.toggle('menu-open', open);
    menuBtn && menuBtn.setAttribute('aria-expanded', String(open));
    const m = $('#menu'); if (m) m.toggleAttribute('inert', !open);
  };
  menuBtn && menuBtn.addEventListener('click', () => setMenu(!d.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth >= 1140) setMenu(false); });

  /* ---------- Split lines: stagger index ---------- */
  $$('.split-line').forEach(el => $$('.line > span', el).forEach((s, i) => s.style.setProperty('--i', i)));

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px 12% 0px', threshold: 0 }); // reveal just before it scrolls in, so nothing looks empty
  $$('.rv, .rv-clip, .split-line, .phero__media, .tl__item, [data-count]').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
      countIO.unobserve(el);
      if (reduce) { el.textContent = to.toFixed(dec); return; }
      const t0 = performance.now(), dur = 1600;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * k).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Manifesto: words light up as you scroll ---------- */
  $$('[data-words]').forEach(el => {
    const hl = (el.dataset.words || '').split('|').filter(Boolean).map(s => s.toLowerCase());
    // Wrap words in text nodes only, so inline images inside the sentence survive
    [...el.childNodes].forEach(node => {
      if (node.nodeType !== 3) return;
      const frag = d.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
        const s = d.createElement('span');
        s.className = 'w' + (hl.includes(part.toLowerCase().replace(/[^a-z']/g, '')) ? ' hl-word' : '');
        s.textContent = part;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    });
    const spans = $$('.w', el);
    // One read + only the changed words per frame, and only while the paragraph is near the screen
    let shown = -1, queued = false, near = false;
    const update = () => {
      queued = false;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(p * spans.length);
      if (n === shown) return;
      const lo = Math.min(n, Math.max(shown, 0)), hi = Math.max(n, shown);
      for (let i = lo; i < hi; i++) spans[i].classList.toggle('on', i < n);
      shown = n;
    };
    const onS = () => { if (!reduce && near && !queued) { queued = true; requestAnimationFrame(update); } };
    new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) onS(); }, { rootMargin: '30% 0px' }).observe(el);
    if (reduce) { spans.forEach(s => s.classList.add('on')); return; }
    addEventListener('scroll', onS, { passive: true });
    spans.forEach(s => s.classList.remove('on')); shown = 0; update();
  });

  /* ---------- Services list: hover swaps the photo ---------- */
  $$('[data-svx]').forEach(box => {
    const links = $$('.svx__list a', box), imgs = $$('.svx__media img', box), cap = $('[data-svx-cap]', box);
    const set = (i) => {
      links.forEach((a, k) => a.classList.toggle('is-on', k === i));
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      if (cap) cap.textContent = `0${i + 1} / ${$('.svx__t', links[i]).textContent}`;
    };
    links.forEach((a, i) => { a.addEventListener('mouseenter', () => set(i)); a.addEventListener('focus', () => set(i)); });
  });

  /* ---------- Ticker: duplicate track for seamless loop ---------- */
  $$('.ticker__track').forEach(t => { t.innerHTML += t.innerHTML; });

  /* ---------- Hero "What are we powering?" picker ---------- */
  $$('[data-picker]').forEach(p => {
    const go = $('[data-picker-go]', p);
    $$('[data-type]', p).forEach(b => b.addEventListener('click', () => {
      $$('[data-type]', p).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (go) go.href = `quote.html?type=${b.dataset.type}`;
    }));
  });

  /* ---------- Drag-to-scroll strips ---------- */
  $$('[data-strip]').forEach(strip => {
    let down = false, sx = 0, sl = 0, moved = 0;
    strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = strip.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.abs(dx); if (moved > 4) strip.classList.add('is-drag'); strip.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { down = false; strip.classList.remove('is-drag'); });
    const wrap = strip.closest('section');
    const step = () => (strip.firstElementChild ? strip.firstElementChild.getBoundingClientRect().width + 24 : 400);
    wrap && $$('[data-strip-prev]', wrap).forEach(b => b.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' })));
    wrap && $$('[data-strip-next]', wrap).forEach(b => b.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' })));
  });

  /* ---------- Process timeline rail ---------- */
  const tl = $('[data-tl]');
  if (tl) {
    const fill = $('.tl__rail i', tl);
    const upd = () => {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.55 - r.top) / r.height));
      fill.style.height = (p * 100) + '%';
    };
    let q = false;
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; upd(); }); } }, { passive: true }); upd();
  }

  /* ---------- Live sun widget (Grover Beach, CA) ---------- */
  const sunEl = $('[data-sun]');
  if (sunEl) {
    const LAT = 35.1208, LNG = -120.6213, TZ = 'America/Los_Angeles';
    const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
    const toDays = (dt) => dt.valueOf() / dayMs - 0.5 + J1970 - J2000;
    const fromJ = (j) => new Date((j + 0.5 - J1970) * dayMs);
    const times = (date) => {
      const lw = rad * -LNG, phi = rad * LAT, dd = toDays(date);
      const n = Math.round(dd - J0 - lw / (2 * Math.PI));
      const ds = J0 + lw / (2 * Math.PI) + n;
      const M = rad * (357.5291 + 0.98560028 * ds);
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
      const L = M + C + rad * 102.9372 + Math.PI;
      const dec = Math.asin(Math.sin(e) * Math.sin(L));
      const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
      const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
      const a = J0 + (w + lw) / (2 * Math.PI) + n;
      const Jset = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
      return { rise: fromJ(Jnoon - (Jset - Jnoon)), set: fromJ(Jset), noon: fromJ(Jnoon) };
    };
    const fmt = (dt) => dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
    const draw = () => {
      const now = new Date(), t = times(now);
      const len = (t.set - t.rise) / 36e5;
      $('[data-sun-rise]', sunEl).textContent = fmt(t.rise);
      $('[data-sun-set]', sunEl).textContent = fmt(t.set);
      $('[data-sun-len]', sunEl).textContent = `${Math.floor(len)}h ${Math.round((len % 1) * 60)}m`;
      $('[data-sun-now]', sunEl).textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
      const p = (now - t.rise) / (t.set - t.rise);
      const up = p > 0 && p < 1, k = Math.min(1, Math.max(0, p));
      const x = 160 - 140 * Math.cos(Math.PI * k), y = 96 - 78 * Math.sin(Math.PI * k);
      const s = $('[data-sun-dot]', sunEl), g = $('[data-sun-glow]', sunEl), trail = $('[data-sun-trail]', sunEl);
      s.setAttribute('cx', x); s.setAttribute('cy', y); g.setAttribute('cx', x); g.setAttribute('cy', y);
      s.style.opacity = up ? 1 : .35; g.style.opacity = up ? 1 : 0;
      trail.setAttribute('d', `M20 96 A140 78 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`);
      trail.style.opacity = up ? 1 : 0;
      $('[data-sun-state]', sunEl).textContent = up ? 'Panels producing' : (p <= 0 ? 'Before sunrise' : 'Sun’s down · battery hours');
    };
    draw(); setInterval(draw, 60000);
  }

  /* ---------- Battery planner (services) ---------- */
  const bat = $('[data-bat]');
  if (bat) {
    const CAP = 13.5 * 0.9; // usable kWh of one typical home battery, with reserve
    const loads = $$('[data-kw]', bat);
    const upd = () => {
      const kw = loads.filter(l => l.getAttribute('aria-pressed') === 'true').reduce((s, l) => s + parseFloat(l.dataset.kw), 0);
      const hrs = kw > 0 ? CAP / kw : 0;
      $('[data-bat-hrs]', bat).innerHTML = kw ? `${hrs >= 48 ? '48+' : hrs.toFixed(hrs < 10 ? 1 : 0)}<small>hours</small>` : `0<small>hours</small>`;
      $('[data-bat-kw]', bat).textContent = `${kw.toFixed(2)} kW`;
      $('[data-bat-fill]', bat).style.width = Math.min(100, Math.max(6, (hrs / 24) * 100)) + '%';
      const two = kw ? CAP * 2 / kw : 0;
      $('[data-bat-two]', bat).textContent = kw ? `${two >= 48 ? '48+' : two.toFixed(0)} hours` : '—';
      $('[data-bat-note]', bat).textContent = !kw ? 'Pick what you’d want running during an outage.'
        : hrs >= 24 ? 'One battery carries these essentials through a full day, and solar tops it up when the sun’s out.'
        : hrs >= 10 ? 'Comfortably overnight. With daytime solar recharging, most outages are covered.'
        : 'Heavy loads. We’d look at a second battery or trimming the list. That’s what the site check is for.';
    };
    loads.forEach(l => l.addEventListener('click', () => { l.setAttribute('aria-pressed', String(l.getAttribute('aria-pressed') !== 'true')); upd(); }));
    upd();
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
