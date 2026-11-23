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
| `preview-pack.html` | Pitch page for David: what works, where quotes slip, what we built, next steps |

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
- No animation libraries and no WebGL. Motion is plain CSS (two marquees, the hero badge, map routes,
  hover states), and all of it stops for reduced-motion users. Nothing is hidden waiting for scroll.
- The payback chart and milestones on the homepage are computed at build time by `payback()` in
  `src/build.py`, using the same model as `assets/js/calc.js`. Keep the two in step if you change `ASSUME`.
- Page JavaScript is small: `site.js` (header, menu, picker, sun widget, battery planner) on every page,
  plus `calc.js` / `quote.js` where needed.
