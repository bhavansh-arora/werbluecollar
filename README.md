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
