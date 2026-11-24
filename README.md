# Blue Collar Energy — website concept (Code Bunny)

A static multi-page site. No framework and no build tooling are needed to host it: upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, cPanel).

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home: hero with project picker, manifesto, services, live Buy/Finance/PPA comparator, process, job gallery, crew, service-area map |
| `payment-options.html` | Flagship page: live comparator, 25-year savings chart (hover + table view), "Which fits me?" quiz, side-by-side table, FAQ |
| `services.html` | Homes (live Grover Beach sun widget), Business, Battery (outage planner), Ground mounts, what every job includes |
| `process.html` | Four-step scroll timeline with "You / Blue Collar" responsibilities, plus the three promises |
| `about.html` | Story, leadership, promises, service area and office |
| `quote.html` | 5-step adaptive quote flow with live estimate, plus contact details |

## Editing
- Pages are composed from `src/pages/*.html` plus shared header, footer and CTA in `src/build.py`.
  After editing, run `python3 src/build.py` to regenerate the root HTML files.
- Design tokens (colors, type, spacing) live at the top of `assets/css/site.css`.
  It is one stylesheet with no override layers: change a rule where it is, don't append a new "pass" at the bottom.
- Type is Barlow and Barlow Semi Condensed, self-hosted in `assets/fonts/` (no Google Fonts request).
- Nothing is hidden waiting for scroll or for JavaScript. Calculator numbers for the default $220 bill
  are written into the HTML (see `BILL` in `src/build.py` and the option cards), so the page is complete on first paint.
  If you change `ASSUME`, update those defaults too.
- Shared blocks (map, town list, bill slider, CTA, footer) are partials in `src/build.py`.

## Design
- Look: warm cream base, pastel section cards (forest, sky, ember), ink panels and gold accents.
  Type is Inter Tight with Instrument Serif italics for accent words and Geist Mono for labels,
  all self-hosted in `assets/fonts/`.
- No animation libraries and no WebGL. Motion lives in `assets/js/motion.js` (plain JS) and the motion
  block of `site.css`:
  - First visit of the day: a loader whose battery charges with real page progress (at least 1.4s, at most 7s; it runs from an inline script so it starts before motion.js and lifts only once the page is ready),
    then lifts on a curved edge. Later page changes: a curtain sweeps up with the next page's name and
    lifts on arrival (about 0.4s). Both have hard time limits.
  - Headlines rise word by word, cards and lists stagger in, numbers count up, payback bars grow,
    the "why" statement lights up as you scroll, photos drift (parallax), process cards stack,
    the big word band speeds up with scrolling, a spotlight follows the cursor on cards, primary buttons
    are magnetic, and the footer wordmark letters rise and lift near the cursor.
  - Smoothness: `window.BCE` in `site.js` is the one frame loop for every scroll effect. Geometry is
    cached in `onMeasure` (load, resize, content size changes) and `onFrame` only does arithmetic and
    style writes, so scrolling never forces layout. Mouse-wheel scrolling is eased (no library; touch,
    keyboard and scrollbar stay native); big sections rise and settle as they arrive; decorative loops
    pause off screen (`.is-off`); internal pages are prefetched on hover.
  - Rule: content that is already on screen is never hidden; entrances only apply below the fold or
    behind a cover. Reduced-motion users get none of it.
- Inner pages: each starts with `<!--HERO {json}-->` (photo, title, lede, buttons, facts), rendered by
  `photo_hero()` in `src/build.py`. Services has the clickable house explorer (`[data-explore]`), How it works
  the sticky journey (`[data-journey]`), both in `site.js`. The waiting-cost chart on Ways to pay is drawn
  at build time by `wait_chart()` from the same model as the calculator.
- "A day on a Blue Collar home" (`assets/js/day.js`): an SVG house from 5:30 AM to midnight, simulated in
  5-minute steps for the same 4.0 kW system plus a 13.5 kWh battery, with play, scrub and an outage switch.
- The payback chart and milestones on the homepage are computed at build time by `payback()` in
  `src/build.py`, using the same model as `assets/js/calc.js`. Keep the two in step if you change `ASSUME`.
- Page JavaScript is small: `site.js` (header, menu, picker, sun widget, battery planner) on every page,
  plus `calc.js` / `quote.js` where needed.
