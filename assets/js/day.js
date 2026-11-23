/* Blue Collar Energy — "A day on a Blue Collar home". Concept by Code Bunny.
   An illustrative day for the same 4.0 kW system the calculator sizes for a $220 bill, plus one
   13.5 kWh battery. The whole day is simulated up front in 5-minute steps, so scrubbing, playing
   and the outage switch all read from the same numbers. Plays only while on screen. */
(() => {
  const root = document.querySelector('[data-day]');
  if (!root) return;
  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Model ---------- */
  const KW = 4.0, CAP = 13.5, RES = 0.1, MAXP = 5, RATE = 0.40, START = 330, END = 1440, STEP = 5;
  const bump = (h, c, w) => Math.exp(-Math.pow((h - c) / w, 2));
  const solarAt = (h) => KW * 0.82 * Math.pow(Math.max(0, Math.sin(Math.PI * (h - 6.4) / 13.2)), 1.2);
  const loadAt = (h, out) => {
    let l = 0.35 + 0.65 * bump(h, 7.4, 0.9) + (h > 9 && h < 17 ? 0.25 : 0) + 1.35 * bump(h, 19, 1.5);
    if (!out && h >= 20.5 && h < 23.5) l += 1.4;                       // the EV charges after dinner
    return out ? l * 0.55 : l;                                         // outage: essentials only
  };
  const simulate = (out) => {
    const rows = []; let soc = 0.35 * CAP, saved = 0;
    for (let m = START; m <= END; m += STEP) {
      const h = m / 60, dt = STEP / 60, sol = solarAt(h), load = loadAt(h, out);
      let charge = 0, dis = 0, exp = 0, imp = 0, net = sol - load;
      if (net > 0) { charge = Math.min(net, MAXP, (CAP - soc) / dt); exp = out ? 0 : net - charge; }
      else { dis = Math.min(-net, MAXP, Math.max(0, soc - RES * CAP) / dt); imp = out ? 0 : -net - dis; }
      soc += (charge - dis) * dt;
      saved += (load - imp) * dt * RATE;
      rows.push({ m, sol, load, charge, dis, exp, imp, soc: soc / CAP, saved });
    }
    return rows;
  };
  const DAYS = { normal: simulate(false), outage: simulate(true) };

  /* ---------- Scene ---------- */
  const SKY = [[5.5, '#141f36', '#2c3352'], [6.5, '#536fae', '#f2ae78'], [8, '#4c84cf', '#bcd5ed'], [12, '#3f7fd6', '#d2e4f5'],
    [17, '#4a77c1', '#ead0a6'], [19.4, '#3c4b88', '#f08a52'], [20.4, '#1e2848', '#51406a'], [24, '#0d1427', '#1b2340']];
  const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  const skyAt = (h) => {
    let i = SKY.findIndex(k => k[0] > h); if (i <= 0) i = 1;
    const [h0, t0, b0] = SKY[i - 1], [h1, t1, b1] = SKY[i], t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
    return [mix(t0, t1, t), mix(b0, b1, t)];
  };
  const PHASES = [
    [0, 'Early morning', 'The battery covers breakfast.', 'Before sunrise the house runs on what the battery stored yesterday, so you are not buying power at all.'],
    [6.6, 'Morning', 'Your home runs on sunshine.', 'By mid-morning the panels cover everything the house needs, and the extra starts filling the battery.'],
    [10.5, 'Midday', 'The battery fills up.', 'Peak sun. The house is covered and the surplus fills the battery. Once it is full, the extra goes back to the utility.'],
    [15.5, 'Late afternoon', 'Ready for the evening peak.', 'Production tapers off. The battery is full and waiting for 4 to 9 PM, when power costs the most.'],
    [19.6, 'Evening', 'The battery takes the expensive hours.', 'After sunset the battery runs the house and charges the car, so you buy little or nothing at peak rates.']
  ];
  const fmtT = (m) => { const h = Math.floor(m / 60) % 24, mm = String(Math.round(m % 60)).padStart(2, '0'); return `${(h % 12) || 12}:${mm} ${h < 12 || h === 24 ? 'AM' : 'PM'}`; };

  const el = {
    top: $('[data-sky-top]'), bot: $('[data-sky-bot]'), sun: $('[data-sun]'), moon: $('[data-moon]'), stars: $('[data-stars]'),
    night: $('[data-night]'), glow: $$('[data-glow]'), panels: $('[data-panels]'), bat: $('[data-batfill]'), batpct: $('[data-batpct]'),
    car: $('[data-carlight]'), wire: $('[data-wire]'),
    fSun: $('[data-flow="sun"]'), fBat: $('[data-flow="bat"]'), fGrid: $('[data-flow="grid"]'), fCar: $('[data-flow="car"]'),
    time: $('[data-d-time]'), grid: $('[data-d-grid]'), range: $('[data-d-range]'), play: $('[data-d-play]'), out: $('[data-d-outage]'),
    sol: $('[data-d-sol]'), load: $('[data-d-load]'), soc: $('[data-d-soc]'), state: $('[data-d-state]'), saved: $('[data-d-saved]'),
    pk: $('[data-d-pk]'), ph: $('[data-d-ph]'), pp: $('[data-d-pp]')
  };
  let minute = 7 * 60, outage = false, playing = false, phase = -1;
  const flow = (path, on, rev, speed) => { path.classList.toggle('on', on); path.classList.toggle('rev', !!rev); path.style.animationDuration = (on ? Math.max(0.5, 2.6 - speed) : 2) + 's'; };

  const draw = () => {
    const rows = DAYS[outage ? 'outage' : 'normal'];
    const r = rows[Math.min(rows.length - 1, Math.max(0, Math.round((minute - START) / STEP)))];
    const h = minute / 60, [top, bot] = skyAt(h);
    el.top.setAttribute('stop-color', top); el.bot.setAttribute('stop-color', bot);
    const day = h >= 6.4 && h <= 19.6, k = (h - 6.4) / 13.2;
    if (day) { el.sun.setAttribute('transform', `translate(${(60 + 680 * k).toFixed(1)} ${(320 - 250 * Math.sin(Math.PI * k)).toFixed(1)})`); }
    el.sun.style.opacity = day ? 1 : 0;
    const nk = h > 19.6 ? (h - 19.6) / 10 : (h + 4.4) / 10;
    el.moon.setAttribute('transform', `translate(${(80 + 640 * nk).toFixed(1)} ${(150 - 90 * Math.sin(Math.PI * nk)).toFixed(1)})`);
    const dark = h < 6.2 ? 1 : h < 7.4 ? (7.4 - h) / 1.2 : h > 20.6 ? 1 : h > 19 ? (h - 19) / 1.6 : 0;
    el.moon.style.opacity = el.stars.style.opacity = dark.toFixed(2);
    el.night.style.opacity = (dark * 0.55).toFixed(2);
    el.glow.forEach(g => { g.style.opacity = (0.15 + dark * 0.85).toFixed(2); });
    el.panels.style.setProperty('--shine', Math.min(1, r.sol / 2.6).toFixed(2));
    const soc = Math.round(r.soc * 100);
    el.bat.setAttribute('height', (r.soc * 52).toFixed(1)); el.bat.setAttribute('y', (304 + 52 * (1 - r.soc)).toFixed(1));
    el.batpct.textContent = soc + '%';
    el.car.style.opacity = (!outage && h >= 20.5 && h < 23.5) ? 1 : 0;
    el.wire.classList.toggle('down', outage);
    flow(el.fSun, r.sol > 0.05, false, r.sol);
    flow(el.fBat, r.charge > 0.05 || r.dis > 0.05, r.dis > 0.05, Math.max(r.charge, r.dis));
    flow(el.fGrid, r.exp > 0.05 || r.imp > 0.05, r.exp > 0.05, Math.max(r.exp, r.imp));
    flow(el.fCar, !outage && h >= 20.5 && h < 23.5, false, 1.4);

    el.time.textContent = fmtT(minute);
    el.grid.textContent = outage ? 'Down' : r.exp > 0.05 ? 'Exporting' : r.imp > 0.05 ? 'Importing' : 'Idle';
    el.grid.parentElement.classList.toggle('is-down', outage);
    el.sol.textContent = r.sol.toFixed(1); el.load.textContent = r.load.toFixed(1); el.soc.textContent = soc;
    el.state.textContent = r.charge > 0.05 ? 'Charging' : r.dis > 0.05 ? 'Powering home' : soc >= 99 ? 'Full' : 'Standby';
    el.saved.textContent = '$' + r.saved.toFixed(2);
    el.range.value = minute;
    el.range.style.setProperty('--p', ((minute - START) / (END - START) * 100).toFixed(1) + '%');
    const pi = PHASES.reduce((a, p, i) => h >= p[0] ? i : a, 0) + (outage ? 10 : 0);
    if (pi !== phase) {
      phase = pi;
      const p = PHASES[pi % 10];
      el.pk.textContent = outage ? 'Outage' : p[1];
      el.ph.textContent = outage ? 'Grid down. Lights stay on.' : p[2];
      el.pp.textContent = outage ? 'The house disconnects from the grid and runs essentials on the battery, topped up by the panels while the sun is out.' : p[3];
      el.pk.parentElement.classList.remove('swap'); void el.pk.parentElement.offsetWidth; el.pk.parentElement.classList.add('swap');
    }
  };

  /* ---------- Controls ---------- */
  let raf = 0, last = 0, onScreen = false;
  const loop = (now) => {
    const dt = last ? Math.min(100, now - last) : 16; last = now;
    minute += dt * 0.06;                                               // a whole day in about 18 seconds
    if (minute > END) minute = START;
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  };
  const setPlay = (on) => {
    playing = on; root.classList.toggle('is-playing', on);
    el.play.setAttribute('aria-label', on ? 'Pause the day' : 'Play the day');
    cancelAnimationFrame(raf); last = 0;
    if (on) raf = requestAnimationFrame(loop);
  };
  let userPaused = reduce;
  el.play.addEventListener('click', () => { userPaused = playing; setPlay(!playing); });
  el.range.addEventListener('input', () => { minute = +el.range.value; userPaused = true; setPlay(false); draw(); });
  el.out.addEventListener('click', () => { outage = !outage; el.out.setAttribute('aria-pressed', String(outage)); root.classList.toggle('is-outage', outage); draw(); });
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (!onScreen) setPlay(false); else if (!userPaused) setPlay(true); }, { threshold: 0.35 }).observe($('.day__scene'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlay(false); else if (onScreen && !userPaused) setPlay(true); });
  draw();
})();
