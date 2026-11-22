/* Blue Collar Energy — adaptive 5-step quote flow. Concept by Code Bunny.
   - Saves progress locally so an interrupted visitor can pick up where they left off.
   - Prefills from ?type=, ?bill=, ?pay= set by calculators elsewhere on the site.
   - Captures source page + UTM tags so David knows which page or ad sent the lead.
   - To go live: set data-endpoint on the form (Formspree, Netlify, HubSpot, CRM webhook). */
(() => {
  const d = document, $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const form = $('[data-wiz]');
  if (!form) return;
  const KEY = 'bce-quote-v1';
  const steps = $$('.wiz__step', form), bar = $('.wiz__bar i', form);
  const back = $('[data-back]', form), next = $('[data-next]', form), nextT = $('[data-next-t]', form);
  const stepLbl = $('[data-step-lbl]', form), stepName = $('[data-step-name]', form);
  const NAMES = ['Project', 'Your bill', 'Your property', 'How to pay', 'Your details'];
  const PAY = { buy: 'Purchase', fin: 'Finance', ppa: 'PPA', all: 'All three, side by side' };
  const TYPE = { home: 'Home solar', business: 'Business solar', battery: 'Battery storage', ground: 'Ground mount' };

  let state = { step: 0, type: '', bill: 220, own: '', roof: '', pay: '', name: '', email: '', phone: '', address: '', time: '', notes: '' };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const qp = new URLSearchParams(location.search);
  if (qp.get('type') && TYPE[qp.get('type')]) { state.type = qp.get('type'); state.step = Math.max(state.step, 1); }
  if (qp.get('bill')) { state.bill = Math.min(800, Math.max(60, +qp.get('bill') || 220)); }
  if (qp.get('pay') && PAY[qp.get('pay')]) state.pay = qp.get('pay');
  if (state.done) state.step = 0;

  const src = {
    page: document.referrer ? new URL(document.referrer).pathname : 'direct',
    utm: ['utm_source', 'utm_medium', 'utm_campaign'].map(k => qp.get(k)).filter(Boolean).join(' / ')
  };

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  // Tile groups
  $$('[data-group]', form).forEach(g => {
    const key = g.dataset.group;
    $$('[data-val]', g).forEach(t => {
      t.setAttribute('aria-pressed', String(state[key] === t.dataset.val));
      t.addEventListener('click', () => {
        state[key] = t.dataset.val;
        $$('[data-val]', g).forEach(x => x.setAttribute('aria-pressed', String(x === t)));
        save(); sync(); hideErr(g);
        // auto-advance on single-choice steps
        const st = t.closest('.wiz__step');
        if (st && st.dataset.auto !== undefined && valid(state.step, true)) setTimeout(() => go(state.step + 1), 280);
      });
    });
  });

  // Bill slider
  const range = $('[data-wbill]', form), out = $('[data-wbill-out]', form);
  range.value = state.bill;
  range.addEventListener('input', () => { state.bill = +range.value; save(); sync(); });

  // Text fields
  $$('[data-f]', form).forEach(inp => {
    inp.value = state[inp.dataset.f] || '';
    inp.addEventListener('input', () => { state[inp.dataset.f] = inp.value; save(); inp.classList.remove('is-bad'); const e = inp.parentElement.querySelector('.field__err'); if (e) e.textContent = ''; });
  });

  const hideErr = (g) => { const e = g.parentElement.querySelector('[data-err]'); if (e) e.textContent = ''; };
  const showErr = (g, msg) => { const e = g.parentElement.querySelector('[data-err]'); if (e) e.textContent = msg; };

  function valid(n, quiet) {
    if (n === 0 && !state.type) { quiet || showErr($('[data-group="type"]', form), 'Pick one to continue.'); return false; }
    if (n === 2 && (!state.own || !state.roof)) { quiet || showErr($('[data-group="roof"]', form), 'Two quick taps: ownership and roof age.'); return false; }
    if (n === 3 && !state.pay) { quiet || showErr($('[data-group="pay"]', form), 'Pick one, or choose “All three”.'); return false; }
    if (n === 4) {
      let ok = true;
      const chk = (f, test, msg) => { const i = $(`[data-f="${f}"]`, form); if (!test(i.value.trim())) { ok = false; if (!quiet) { i.classList.add('is-bad'); i.parentElement.querySelector('.field__err').textContent = msg; } } };
      chk('name', v => v.length > 1, 'Tell us what to call you.');
      chk('email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'That email doesn’t look right.');
      chk('phone', v => v.replace(/\D/g, '').length >= 10, 'A 10-digit number so we can call back.');
      if (!ok && !quiet) { const b = $('.is-bad', form); b && b.focus(); }
      return ok;
    }
    return true;
  }

  function go(n) {
    state.step = Math.max(0, Math.min(steps.length - 1, n)); save();
    steps.forEach((s, i) => s.classList.toggle('on', i === state.step));
    bar.style.width = ((state.step + 1) / steps.length * 100) + '%';
    stepLbl.textContent = `Step ${state.step + 1} of ${steps.length}`;
    stepName.textContent = NAMES[state.step];
    back.style.visibility = state.step === 0 ? 'hidden' : 'visible';
    nextT.textContent = state.step === steps.length - 1 ? 'Send my request' : 'Continue';
    const top = form.getBoundingClientRect().top + scrollY - 110;
    if (scrollY > top + 40) scrollTo({ top, behavior: 'smooth' });
  }

  function sync() {
    const pct = (state.bill - range.min) / (range.max - range.min) * 100;
    range.style.setProperty('--p', pct + '%');
    out.textContent = '$' + state.bill;
    const m = window.BCE_MODEL(state.bill);
    const pay = state.pay && state.pay !== 'all' ? state.pay : 'buy';
    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    $('[data-e="type"]').textContent = TYPE[state.type] || '—';
    $('[data-e="size"]').textContent = m.size.toFixed(1) + ' kW';
    $('[data-e="pay"]').textContent = PAY[state.pay] || 'Not chosen yet';
    $('[data-e="save"]').textContent = money(m[pay].save1);
    $('[data-e="save-l"]').textContent = state.pay && state.pay !== 'all' ? `Est. monthly savings, year one · ${PAY[pay]}` : 'Est. monthly savings, year one · Purchase';
    $('[data-e="net"]').textContent = money(m[pay].net);
    $('[data-e="up"]').textContent = m[pay].upfront ? money(m[pay].upfront) : '$0';
  }

  back.addEventListener('click', () => go(state.step - 1));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid(state.step)) return;
    if (state.step < steps.length - 1) { go(state.step + 1); return; }
    next.disabled = true; nextT.textContent = 'Sending…';
    const payload = { ...state, source: src, submitted: new Date().toISOString() };
    delete payload.step;
    try {
      if (form.dataset.endpoint) {
        await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      } else { await new Promise(r => setTimeout(r, 900)); }
    } catch (err) { /* keep the visitor moving; fall back to phone CTA on the done screen */ }
    $('[data-done-name]').textContent = state.name.split(' ')[0] || 'there';
    $('[data-done-pay]').textContent = (PAY[state.pay] || 'all three options').toLowerCase().replace('all three, side by side', 'all three options side by side');
    form.hidden = true; $('[data-done]').hidden = false;
    state.done = true; save();
    try { localStorage.removeItem(KEY); } catch (e) {}
    $('[data-done]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  sync(); go(state.step);
})();
