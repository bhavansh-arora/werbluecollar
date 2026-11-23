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

## 3D and motion
- **Hero scene** (`assets/js/hero3d.js`, Three.js r169 vendored in `assets/js/vendor/`, MIT): a procedural
  Central Coast home with the 4.0 kW / 10-panel array the $220 calculator default sizes. No model files.
  It shows `assets/img/hero-3d.webp` (a render of the same scene) until the first frame is drawn, pauses
  off screen, and draws one still frame for reduced-motion users. Hover a panel to inspect it.
- **Regenerating the poster** after changing the scene: open `index.html#poster` over http (the `#poster`
  hash freezes the scene at t=0), screenshot `.hero__scene` at 1440x900 @1.25x, save as
  `hero-3d.webp` (1800w) and `hero-3d-sm.webp` (900w).
- **Exploded panel**, **3D map**, **tilt cards** and **scroll depth** are CSS 3D plus a little JS in `site.js`.
  Scroll-linked effects use CSS scroll timelines (Chrome, Edge, Safari 26+); other browsers show them still.
- The rule throughout: motion decorates, it never hides content. Nothing starts invisible.
- ES modules don't run from `file://`; preview with any static server (e.g. `python3 -m http.server`).
- **Calculator assumptions** live in one object, `ASSUME`, at the top of `assets/js/calc.js`
  (utility rate, $/W, loan APR/term, PPA rate and escalator, production, net-billing value).
  The text explaining the assumptions on the page updates automatically.

## Going live: connect the quote form
Set `data-endpoint` on the form in `src/pages/quote.html` to a Formspree, Netlify Forms, HubSpot or CRM webhook URL, then rebuild.
The form POSTs JSON: project type, bill, ownership, roof age, payment preference, contact details, source page and UTM tags.
With no endpoint set, it runs in demo mode: it shows the thank-you screen but sends nothing.

## Before launch
- Replace the calculator placeholders with Blue Collar's real pricing, lender terms and PPA partner rates.
- Add real Google reviews (none were invented for the concept).
- Check the leadership photos: `david.webp` and `christian.webp` keep the file names used on the current site.
