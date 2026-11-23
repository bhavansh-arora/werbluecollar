/* Blue Collar Energy — motion. Concept by Code Bunny.
   GSAP + ScrollTrigger + SplitText, with Lenis for smooth scrolling.
   Rules: headlines reveal line by line just before they come into view; body copy, numbers
   and buttons are never hidden; the hero intro is under a second; reduced motion gets none of it. */
(() => {
  const root = document.documentElement;
  const ready = () => root.classList.add('ready');
  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gsap || !ScrollTrigger || reduce) { ready(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- smooth scroll ---------- */
  if (Lenis && matchMedia('(pointer: fine)').matches) {
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    });
    window.BCE_LENIS = lenis;
  }

  const ease = 'expo.out';
  const splitLines = (el) => SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln', aria: 'auto' });

  /* ---------- hero intro: headline lines rise, then the rest settles in ---------- */
  const heroH = document.querySelector('[data-split="hero"]');
  document.fonts.ready.then(() => {
    if (heroH) {
      const sp = splitLines(heroH);
      const tl = gsap.timeline({ defaults: { ease } });
      tl.from(sp.lines, { yPercent: 110, duration: 1.1, stagger: 0.08 }, 0.05)
        .from('.hero [data-fade]', { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0.35)
        .from('.stage__sticky', { autoAlpha: 0, scale: 1.04, duration: 1.4, ease: 'power2.out' }, 0);
    }
    ready();

    /* ---------- section headlines ---------- */
    $$('main h2.d-l, main h2.d-xl, main h1.d-xl, [data-split]:not([data-split="hero"])').forEach((el) => {
      if (el.closest('.inside') && el !== document.querySelector('.inside [data-split]')) return;
      const sp = splitLines(el);
      gsap.from(sp.lines, {
        yPercent: 105, duration: 1, stagger: 0.07, ease,
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    /* ---------- photos: settle from a slight zoom as they arrive (always visible) ---------- */
    $$('[data-settle]').forEach((el) => {
      gsap.fromTo(el, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center center', scrub: true } });
    });

    /* ---------- crew photo opens from a framed card to full width ---------- */
    $$('[data-open]').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(6% 8% 6% 8% round 24px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 12px)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: true }
      });
    });

    ScrollTrigger.refresh();
  });

  /* ---------- magnetic buttons ---------- */
  if (matchMedia('(pointer: fine)').matches) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- services: a photo follows the cursor over the list ---------- */
  $$('[data-svlist]').forEach((list) => {
    if (!matchMedia('(pointer: fine)').matches) return;
    const fl = document.createElement('div');
    fl.className = 'svfloat'; fl.setAttribute('aria-hidden', 'true');
    const imgs = $$('a[data-img]', list).map((a) => { const i = new Image(); i.src = a.dataset.img; i.alt = ''; fl.appendChild(i); return i; });
    document.body.appendChild(fl);
    const xTo = gsap.quickTo(fl, 'x', { duration: 0.55, ease: 'power3' });
    const yTo = gsap.quickTo(fl, 'y', { duration: 0.55, ease: 'power3' });
    const rTo = gsap.quickTo(fl, 'rotation', { duration: 0.8, ease: 'power3' });
    let lastX = 0;
    list.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); rTo(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4)); lastX = e.clientX; });
    $$('a[data-img]', list).forEach((a, i) => {
      a.addEventListener('pointerenter', () => { fl.classList.add('on'); imgs.forEach((im, k) => im.classList.toggle('on', k === i)); });
    });
    list.addEventListener('pointerleave', () => { fl.classList.remove('on'); rTo(0); });
  });
})();
