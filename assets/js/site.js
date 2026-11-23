/* Blue Collar Energy — core interactions. Concept by Code Bunny.
   Small and dependency-free. Nothing here hides content; it only adds behaviour
   (header state, menu, picker, live widgets). */
(() => {
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  /* ---------- Header: transparent over the hero, solid once you scroll ---------- */
  const hdr = $('[data-hdr]'), mbar = $('.mbar'), concept = $('.concept');
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (hdr) hdr.classList.toggle('is-scrolled', y > 40);
    if (mbar) mbar.classList.toggle('on', y > 480);
    if (concept) concept.classList.toggle('on', y > innerHeight * 0.85);
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('[data-menu-btn]'), menu = $('#menu');
  const setMenu = (open) => {
    d.body.classList.toggle('menu-open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    if (menu) menu.toggleAttribute('inert', !open);
  };
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(!d.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth >= 1100) setMenu(false); });

  /* ---------- Hero picker: project type -> quote link ---------- */
  $$('[data-picker]').forEach(p => {
    const go = $('[data-picker-go]', p), sel = $('[data-picker-select]', p);
    if (sel && go) sel.addEventListener('change', () => { go.href = `quote.html?type=${sel.value}`; });
    $$('[data-type]', p).forEach(b => b.addEventListener('click', () => {
      $$('[data-type]', p).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (go) go.href = `quote.html?type=${b.dataset.type}`;
    }));
  });

  /* ---------- Footer clock (Grover Beach time) ---------- */
  $$('[data-clock]').forEach(el => {
    const tick = () => { el.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }) + ' PT'; };
    tick(); setInterval(tick, 30000);
  });

  /* ---------- Sunrise / sunset for Grover Beach, CA ---------- */
  const LAT = 35.1208, LNG = -120.6213, TZ = 'America/Los_Angeles';
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
  const toDays = (dt) => dt.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const fromJ = (j) => new Date((j + 0.5 - J1970) * dayMs);
  const hm = (dt) => dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
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

  /* ---------- Home facts card: live local time and today's sun ---------- */
  const sunline = $('[data-sunline]');
  if (sunline) {
    const t = times(new Date()), now = new Date();
    sunline.textContent = now < t.rise ? `Sunrise at ${hm(t.rise)}` : now < t.set ? `Sun's up until ${hm(t.set)}` : `Sunrise at ${hm(times(new Date(+now + dayMs)).rise)}`;
  }
  $$('[data-clock-short]').forEach(el => { const tick = () => { el.textContent = hm(new Date()); }; tick(); setInterval(tick, 30000); });

  /* ---------- Live sun widget (services page) ---------- */
  const sunEl = $('[data-sun]');
  if (sunEl && !sunEl.closest('[data-day]')) {
    const fmt = hm;
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

  /* ---------- Services: tap a hotspot on the house to explain that part ---------- */
  $$('[data-explore]').forEach(box => {
    const items = $$('i', $('[data-ex-items]', box).content);
    const hots = $$('.hot', box), tabs = $$('[role="tab"]', box), card = $('.explore__card', box);
    const f = { n: $('[data-ex-n]', box), k: $('[data-ex-k]', box), t: $('[data-ex-t]', box), d: $('[data-ex-d]', box), a: $('[data-ex-a]', box) };
    let cur = 0, timer = 0, touched = false;
    const show = (i) => {
      cur = i; const it = items[i];
      hots.forEach((h, k) => h.classList.toggle('is-on', k === i));
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
      box.dataset.part = i;
      f.n.textContent = String(i + 1).padStart(2, '0'); f.k.textContent = it.dataset.k; f.t.innerHTML = it.dataset.t; f.d.textContent = it.dataset.d;
      f.a.href = it.dataset.a; f.a.firstChild.nodeValue = it.dataset.al + ' ';
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    };
    const pick = (i) => { touched = true; clearInterval(timer); show(i); };
    [...hots, ...tabs].forEach(b => b.addEventListener('click', () => pick(+b.dataset.ex)));
    // gently tour the parts while it's on screen, until someone picks one
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting && !touched) timer = setInterval(() => show((cur + 1) % items.length), 3600);
    }, { threshold: 0.4 }).observe(box);
  });

  /* ---------- Process journey: sticky photo and rail follow the step in view ---------- */
  $$('[data-journey]').forEach(j => {
    const steps = $$('[data-j-step]', j), imgs = $$('[data-j-img]', j), cells = $$('[data-j-cell]', j);
    const num = $('[data-j-num]', j), name = $('[data-j-name]', j), time = $('[data-j-time]', j);
    let cur = -1, raf = 0;
    const update = () => {
      raf = 0;
      const mid = innerHeight * 0.5; let idx = 0;
      steps.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        cells[i].style.setProperty('--f', Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height))).toFixed(3));
        if (r.top <= mid) idx = i;
      });
      if (idx === cur) return;
      cur = idx;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === idx));
      cells.forEach((c, k) => c.classList.toggle('is-now', k === idx));
      steps.forEach((s, k) => s.classList.toggle('is-now', k === idx));
      name.innerHTML = steps[idx].dataset.name; time.textContent = steps[idx].dataset.time;
      num.classList.add('is-swap'); num.textContent = String(idx + 1).padStart(2, '0');
      requestAnimationFrame(() => requestAnimationFrame(() => num.classList.remove('is-swap')));
    };
    cells.forEach((c, i) => $('button', c).addEventListener('click', () => {
      const y = steps[i].getBoundingClientRect().top + scrollY - innerHeight * 0.3;
      scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    j.classList.add('is-live');
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
