/* Blue Collar Energy — Buy · Finance · PPA comparison engine. Concept by Code Bunny.
   Illustrative model only. Every assumption is listed in ASSUME and printed on the page. */
(() => {
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  const ASSUME = {
    rate: 0.40,        // $/kWh blended utility rate, Central Coast residential
    esc: 0.035,        // utility rate rise per year
    deg: 0.005,        // panel output loss per year
    yield: 1650,       // kWh per kW per year, Grover Beach sun
    ppw: 3.10,         // installed $/watt before incentives
    offset: 0.80,      // share of retail value a solar kWh saves under net billing
    apr: 0.0799,       // solar loan APR
    term: 20,          // loan years
    ppa0: 0.26,        // PPA $/kWh, year one
    ppaEsc: 0.029,     // PPA rate rise per year
    years: 25
  };
  window.BCE_ASSUME = ASSUME;

  const money = (n, sign) => {
    const s = Math.round(Math.abs(n)).toLocaleString('en-US');
    return (n < 0 ? '−$' : (sign && n > 0 ? '+$' : '$')) + s;
  };
  const kfmt = (n) => (n < 0 ? '−' : '') + '$' + (Math.abs(n) >= 1000 ? (Math.abs(n) / 1000).toFixed(Math.abs(n) >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k' : Math.round(Math.abs(n)));

  function model(bill) {
    const A = ASSUME;
    const kwhYr = bill * 12 / A.rate;
    const size = Math.max(2.4, Math.round(kwhYr / A.yield * 10) / 10);
    const prod0 = size * A.yield;
    const cost = size * 1000 * A.ppw;
    const r = A.apr / 12, n = A.term * 12;
    const pmt = cost * r / (1 - Math.pow(1 + r, -n));
    const cum = { buy: [-cost], fin: [0], ppa: [0] };
    let yr1 = {};
    for (let t = 1; t <= A.years; t++) {
      const prod = prod0 * Math.pow(1 - A.deg, t - 1);
      const avoided = prod * A.rate * Math.pow(1 + A.esc, t - 1) * A.offset;
      const loan = t <= A.term ? pmt * 12 : 0;
      const ppa = prod * A.ppa0 * Math.pow(1 + A.ppaEsc, t - 1);
      cum.buy.push(cum.buy[t - 1] + avoided);
      cum.fin.push(cum.fin[t - 1] + avoided - loan);
      cum.ppa.push(cum.ppa[t - 1] + avoided - ppa);
      if (t === 1) yr1 = { avoided, loan, ppa };
    }
    const be = cum.buy.findIndex(v => v >= 0);
    return {
      bill, kwhYr, size, prod0, cost, pmt, cum,
      buy: { upfront: cost, monthly: 0, save1: yr1.avoided / 12, net: cum.buy[A.years], be: be < 0 ? null : be },
      fin: { upfront: 0, monthly: pmt, save1: (yr1.avoided - yr1.loan) / 12, net: cum.fin[A.years], be: 0 },
      ppa: { upfront: 0, monthly: yr1.ppa / 12, save1: (yr1.avoided - yr1.ppa) / 12, net: cum.ppa[A.years], be: 0 }
    };
  }
  window.BCE_MODEL = model;

  /* Animate a number into an element */
  const tweens = new WeakMap();
  function tweenTo(el, to, fmt) {
    const from = tweens.get(el) ?? to;
    tweens.set(el, to);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * k);
      if (p < 1 && tweens.get(el) === to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const SER = [
    { k: 'buy', name: 'Purchase', c: 'var(--c-buy)' },
    { k: 'fin', name: 'Finance', c: 'var(--c-fin)' },
    { k: 'ppa', name: 'PPA', c: 'var(--c-ppa)' }
  ];
  /* ---------- Comparator ---------- */
  $$('[data-cmp]').forEach(cmp => {
    const range = $('[data-bill]', cmp), out = $('[data-bill-out]', cmp);
    const chart = $('[data-chart]', cmp.closest('section') || d) ? $('[data-chart]', cmp.closest('section')) : null;
    const update = () => {
      const bill = +range.value;
      const pct = (bill - range.min) / (range.max - range.min) * 100;
      range.style.setProperty('--p', pct + '%');
      out.firstChild.nodeValue = '$' + bill;
      const m = model(bill);
      const set = (k, fn, v) => $$(`[data-v="${k}"]`, cmp).forEach(el => tweenTo(el, v, fn));
      set('size', v => v.toFixed(1) + ' kW', m.size);
      set('kwh', v => Math.round(v).toLocaleString('en-US'), m.kwhYr);
      set('cost', v => money(v), m.cost);
      ['buy', 'fin', 'ppa'].forEach(o => {
        set(o + '-up', v => money(v), m[o].upfront);
        set(o + '-mo', v => v ? money(v) + '/mo' : '$0', m[o].monthly);
        set(o + '-save', v => money(v, true) + '/mo', m[o].save1);
        set(o + '-net', v => money(v), m[o].net);
      });
      $$('[data-v="buy-be"]', cmp).forEach(el => el.textContent = m.buy.be ? `Year ${m.buy.be}` : '—');
      $$('[data-quote-link]', cmp).forEach(a => { a.href = `quote.html?bill=${bill}${a.dataset.pay ? '&pay=' + a.dataset.pay : ''}`; });
      if (chart) drawChart(chart, m);
    };
    range.addEventListener('input', update);
    update();
  });

  /* ---------- 25-year chart ---------- */
  function drawChart(host, m) {
    const svg = $('svg', host), tip = $('.tip', host), tbody = $('tbody', host);
    // Draw at the real rendered width so type stays at its true pixel size on every screen
    const wrapW = host.querySelector('.chart__svg-wrap').clientWidth || 760;
    const W = Math.max(300, wrapW), H = Math.round(Math.min(420, Math.max(260, W * 0.5)));
    const pl = 52, pr = W < 500 ? 78 : 96, pt = 16, pb = 34;
    host._m = m;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const all = SER.flatMap(s => m.cum[s.k]);
    let lo = Math.min(0, ...all), hi = Math.max(...all);
    const stepV = niceStep((hi - lo) / 5);
    lo = Math.floor(lo / stepV) * stepV; hi = Math.ceil(hi / stepV) * stepV;
    const N = m.cum.buy.length - 1;
    const x = (i) => pl + (W - pl - pr) * i / N;
    const y = (v) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    let g = '<g class="grid">';
    for (let v = lo; v <= hi + 1; v += stepV) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/>`;
    g += '</g><g class="axis">';
    for (let v = lo; v <= hi + 1; v += stepV) g += `<text x="${pl - 10}" y="${y(v) + 4}" text-anchor="end">${kfmt(v)}</text>`;
    for (let i = 0; i <= N; i += (W < 500 ? 10 : 5)) g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${i === 0 ? 'Today' : 'Yr ' + i}</text>`;
    g += '</g>';
    g += `<line class="zero" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/>`;
    // End labels: nudge apart so they never collide
    const ends = SER.map(s => ({ s, v: m.cum[s.k][N], y: y(m.cum[s.k][N]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 30) ends[i].y = ends[i - 1].y + 30;
    SER.forEach(s => {
      const pts = m.cum[s.k].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      g += `<polyline class="ser" points="${pts}" style="stroke:${s.c}"/>`;
    });
    ends.forEach(e => {
      g += `<circle cx="${x(N)}" cy="${y(e.v)}" r="5" fill="${e.s.c}" class="mk"/>`;
      g += `<text class="lab" x="${x(N) + 12}" y="${e.y - 2}">${e.s.name}</text>`;
      g += `<text class="lab" x="${x(N) + 12}" y="${e.y + 13}" style="font-weight:400;fill:rgba(246,244,238,.7)">${kfmt(e.v)}</text>`;
    });
    g += `<g class="hover" style="display:none"><line class="xh" y1="${pt}" y2="${H - pb}"/>${SER.map(s => `<circle r="5" fill="${s.c}" class="mk" data-k="${s.k}"/>`).join('')}</g>`;
    g += `<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent" data-hit/>`;
    svg.innerHTML = g;

    const hover = $('.hover', svg), hit = $('[data-hit]', svg), xh = $('.xh', hover);
    const show = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) * W / r.width;
      const i = Math.max(0, Math.min(N, Math.round((px - pl) / (W - pl - pr) * N)));
      hover.style.display = '';
      xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i));
      SER.forEach(s => { const c = $(`[data-k="${s.k}"]`, hover); c.setAttribute('cx', x(i)); c.setAttribute('cy', y(m.cum[s.k][i])); });
      tip.innerHTML = `<h4>${i === 0 ? 'Today' : 'After year ' + i}</h4>` + SER.map(s => ({ s, v: m.cum[s.k][i] })).sort((a, b) => b.v - a.v)
        .map(o => `<div><span><i class="swatch" style="--c:${o.s.c}"></i>${o.s.name}</span><b>${money(o.v)}</b></div>`).join('');
      tip.classList.add('on');
      const hostR = host.querySelector('.chart__svg-wrap').getBoundingClientRect();
      let lx = (x(i) / W) * r.width + 16; const tw = tip.offsetWidth;
      if (lx + tw > hostR.width) lx = (x(i) / W) * r.width - tw - 16;
      tip.style.transform = `translate(${Math.max(0, lx)}px, ${Math.max(0, (ev.clientY - hostR.top) - 60)}px)`;
    };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', () => { hover.style.display = 'none'; tip.classList.remove('on'); });

    if (tbody) {
      tbody.innerHTML = [0, 1, 5, 10, 15, 20, 25].map(i => `<tr><td>${i === 0 ? 'Today' : 'Year ' + i}</td>${SER.map(s => `<td>${money(m.cum[s.k][i])}</td>`).join('')}</tr>`).join('');
    }
  }
  let resizeT;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => $$('[data-chart]').forEach(h => h._m && drawChart(h, h._m)), 150);
  });
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  /* ---------- Assumption lists ---------- */
  $$('[data-assume]').forEach(el => {
    const A = ASSUME;
    el.innerHTML = `<b>How these numbers are built:</b> sized to cover a year of your usage at ${A.yield.toLocaleString()} kWh per kW (Grover Beach sun) · utility rate $${A.rate.toFixed(2)}/kWh rising ${(A.esc * 100).toFixed(1)}%/yr · each solar kWh saves ${A.offset * 100}% of retail under California net billing · installed at $${A.ppw.toFixed(2)}/W before incentives · loan ${(A.apr * 100).toFixed(2)}% APR, ${A.term} yrs, $0 down · PPA $${A.ppa0.toFixed(2)}/kWh rising ${(A.ppaEsc * 100).toFixed(1)}%/yr · panels lose ${(A.deg * 100).toFixed(1)}%/yr. Tax credits are not included because the rules change; we'll walk you through what applies today. Illustrative only. Your proposal uses your roof, your shade and your actual bills.`;
  });

  /* ---------- Matcher ---------- */
  $$('[data-match]').forEach(root => {
    const qs = $$('.match__q', root), prog = $$('.match__prog i', root);
    const back = $('[data-match-back]', root), res = $('.match__res', root);
    const answers = [];
    let i = 0;
    const NAMES = { buy: 'Purchase', fin: 'Finance', ppa: 'PPA' };
    const COLORS = { buy: 'var(--c-buy)', fin: 'var(--c-fin)', ppa: 'var(--c-ppa)' };
    const show = (n) => {
      i = n;
      qs.forEach((q, k) => q.classList.toggle('on', k === n));
      prog.forEach((p, k) => p.classList.toggle('on', k <= n));
      back.disabled = n === 0;
      $('[data-match-count]', root).textContent = `Question ${n + 1} of ${qs.length}`;
    };
    const score = () => {
      const s = { buy: 0, fin: 0, ppa: 0 }, why = [];
      answers.forEach(a => { if (!a) return; Object.entries(a.w).forEach(([k, v]) => s[k] += v); });
      const max = Math.max(...Object.values(s), 1);
      const best = Object.keys(s).sort((a, b) => s[b] - s[a])[0];
      answers.forEach(a => { if (a && a.why && a.why[best]) why.push(a.why[best]); });
      return { s, max, best, why };
    };
    const render = () => {
      const { s, max, best, why } = score();
      const done = answers.filter(Boolean).length;
      res.style.setProperty('--c', COLORS[best]);
      $('[data-match-title]', res).textContent = done ? NAMES[best] : 'Answer a few';
      $('[data-match-sub]', res).textContent = done ? (done < qs.length ? 'Leaning towards' : 'Your best fit') : 'Your match will build as you go';
      $$('[data-bar]', res).forEach(b => {
        const k = b.dataset.bar, pct = done ? Math.round(s[k] / max * 100) : 0;
        $('i', b).style.width = pct + '%';
        $('b', b).textContent = done ? pct + '%' : '—';
      });
      const ul = $('[data-match-why]', res);
      ul.innerHTML = (why.length ? why : ['Four quick taps. No contact details needed to see your result.'])
        .map(t => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg><span>${t}</span></li>`).join('');
      const cta = $('[data-match-cta]', res);
      cta.href = `quote.html?pay=${best}`;
      cta.querySelector('[data-match-cta-t]').textContent = done ? `Get my ${NAMES[best]} numbers` : 'Get all three priced';
    };
    qs.forEach((q, qi) => {
      $$('button[data-w]', q).forEach(b => b.addEventListener('click', () => {
        $$('button[data-w]', q).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        answers[qi] = { w: JSON.parse(b.dataset.w), why: b.dataset.why ? JSON.parse(b.dataset.why) : null };
        render();
        if (qi < qs.length - 1) setTimeout(() => show(qi + 1), 260);
      }));
    });
    back.addEventListener('click', () => i > 0 && show(i - 1));
    show(0); render();
  });
})();
