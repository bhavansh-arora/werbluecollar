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
- **The panel** (`assets/js/panel3d.js`): one photoreal solar panel modelled in code (bevelled aluminum
  frame, transmissive glass, encapsulant, 120 half-cut mono cells, backsheet, junction box), lit by
  studio softboxes with bloom. It sits in the hero; the "Seven parts. No mystery." section pins it and
  takes it apart layer by layer as you scroll, with labels that track each layer.
  Three.js r169 is vendored in `assets/js/vendor/` (MIT) and loaded through an import map.
- **Motion** (`assets/js/motion.js`): GSAP 3.13 + ScrollTrigger + SplitText (free standard licence) and
  Lenis smooth scrolling, all vendored. Headlines rise line by line just before they reach the screen;
  body copy, numbers and buttons are never hidden. The hero intro is under a second, and a 2.5s
  safety net in `<head>` shows it even if scripts fail.
- **Loading**: a poster render of the panel (`assets/img/hero-panel*.webp`) shows until the first
  WebGL frame; rendering pauses whenever the stage is off screen; phones get a lighter render path.
  Reduced-motion users get no smooth scroll, reveals or idle drift.
- **Regenerating the poster** after changing the scene: open `index.html#poster` over http (the hash
  freezes the pose), wait ~3s, screenshot `.stage__sticky` at 1440x900 @1.25x and save it as
  `hero-panel.webp` (1800w) and `hero-panel-sm.webp` (900w).
- ES modules don't run from `file://`; preview with any static server (e.g. `python3 -m http.server`).
