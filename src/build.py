#!/usr/bin/env python3
"""Compose the static site: src/pages/*.html + shared partials -> /*.html

Each page starts with a JSON meta comment:
<!--META {"title": "...", "desc": "...", "nav": "payment", "scripts": ["calc"], "cta": true} -->
Run:  python3 src/build.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"

PHONE = "(805) 441-0939"
TEL = "tel:+18054410939"
EMAIL = "info@werbluecollar.com"
ADDR = "1198 Farroll Rd, Suite 4, Grover Beach, CA 93433"

NAV = [
    ("payment", "payment-options.html", "Ways to pay"),
    ("services", "services.html", "Services"),
    ("process", "process.html", "How it works"),
    ("about", "about.html", "About"),
    ("quote", "quote.html", "Contact"),
]

ICONS = {
    "arrow": '<path d="M7 17L17 7M9 7h8v8"/>',
    "arrow-r": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "arrow-l": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    "pin": '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    "home": '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    "building": '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>',
    "battery": '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M10 2h4M13 8l-3 4.5h4L11 17"/>',
    "ground": '<path d="M3 20h18"/><path d="M5 16l4-6h10l-4 6z"/><path d="M9 16v4M15 16v4"/><circle cx="18" cy="5" r="2"/>',
    "check": '<path d="M5 12l5 5 9-10"/>',
    "bolt": '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    "wrench": '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    "doc": '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    "map": '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    "fridge": '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 10h12M9 5v2M9 13v3"/>',
    "bulb": '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    "wifi": '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
    "drop": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    "fan": '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-2 7M14 12c4 0 7 1 7 4s-5 2-7-2M12 14c0 4-1 7-4 7s-2-5 2-7M10 12c-4 0-7-1-7-4s5-2 7 2"/>',
    "plug": '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
    "tv": '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
    "heart": '<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/>',
    "star": '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    "x": '<path d="M6 6l12 12M18 6L6 18"/>',
    "spark": '<path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
    "chart": '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    "key": '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    "cash": '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    "cal": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    "plugbolt": '<path d="M4 13h3l2-4 3 8 2-4h6"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    "monitor": '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 6l2 3-2 3 2 3"/>',
}

def sprite():
    syms = "".join(
        f'<symbol id="i-{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{v}</symbol>'
        for k, v in ICONS.items())
    return f'<svg width="0" height="0" style="position:absolute" aria-hidden="true">{syms}</svg>'

FONTS = ["inter-tight", "instrument-serif-italic", "geist-mono"]

def head(meta):
    title = meta["title"]
    preload = "".join(f'\n<link rel="preload" href="assets/fonts/{f}.woff2" as="font" type="font/woff2" crossorigin>' for f in FONTS)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{meta['desc']}">
<meta name="theme-color" content="#13202f">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['desc']}">
<meta property="og:image" content="assets/img/crew-install.webp">
<meta property="og:type" content="website">
<link rel="icon" href="assets/img/logo-mark.png">
<script>(function(){{var d=document.documentElement;d.classList.add('js');try{{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add(sessionStorage.getItem('bce-boot')?'pt-in':'is-loading');}}catch(e){{}}setTimeout(function(){{d.classList.remove('is-loading','pt-in')}},3600);}})();</script>{preload}
<link rel="stylesheet" href="assets/css/site.css">
<script type="application/ld+json">{json.dumps({
    "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness",
    "name": "Blue Collar Energy", "telephone": "+1-805-441-0939", "email": EMAIL,
    "address": {"@type": "PostalAddress", "streetAddress": "1198 Farroll Rd, Suite 4", "addressLocality": "Grover Beach", "addressRegion": "CA", "postalCode": "93433", "addressCountry": "US"},
    "areaServed": ["Grover Beach", "Pismo Beach", "Arroyo Grande", "San Luis Obispo", "Santa Maria"],
    "url": "https://www.werbluecollar.com/"})}</script>
</head>"""

def ic(name, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<svg{c} aria-hidden="true"><use href="#i-{name}"/></svg>'

def btn(label, href, cls="", icon="arrow-r", attrs=""):
    """Pill button with a round arrow chip, as on the reference."""
    return f'<a class="btn {cls}" href="{href}"{attrs}><span>{label}</span><i class="btn__ic">{ic(icon)}</i></a>'

def covers():
    """First-visit loader (a battery charging with real page progress) and the page-change curtain."""
    cells = "<i></i>" * 10
    return f"""
<div class="loader" data-loader aria-hidden="true">
  <div class="loader__glow"></div>
  <div class="loader__in">
    <img class="loader__logo" src="assets/img/logo-mark.png" alt="" width="84" height="84">
    <div class="loader__batt"><div class="loader__cells">{cells}</div></div>
    <div class="loader__meta"><span class="kicker" data-loader-label>Charging up</span><b><span data-loader-num>0</span>%</b></div>
  </div>
</div>
<div class="pt" data-pt aria-hidden="true">
  <div class="pt__in">
    <img class="pt__mark" src="assets/img/logo-mark.png" alt="" width="48" height="48">
    <div class="pt__batt"><i></i><i></i><i></i><i></i><i></i></div>
    <p class="pt__to"><span class="kicker">Heading to</span><b data-pt-name>Blue Collar</b></p>
  </div>
</div>"""

def ticker():
    items = ["Grover Beach, CA", "Free site check · no obligation", "Three prices on paper: buy, finance or PPA",
             '<a href="quote.html">Book yours →</a>', "Permits &amp; utility paperwork handled", "Same crew, same phone number"]
    row = "".join(f"<span>✦ {t}</span>" for t in items)
    return f'<div class="topbar" aria-label="Highlights"><div class="topbar__track">{row}{row}</div></div>'

def header(active):
    links = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{label}</a>' for key, href, label in NAV)
    return f"""
<a class="skip" href="#main">Skip to content</a>
{ticker()}
<header class="hdr" data-hdr>
  <div class="hdr__bar">
    <a class="brand" href="index.html" aria-label="Blue Collar Energy, home">
      <span class="brand__mark"><img src="assets/img/logo-mark.png" alt="" width="40" height="40"></span>
      <span class="brand__word">Blue Collar<small>Energy</small></span>
    </a>
    <nav class="hdr__nav" aria-label="Main">{links}</nav>
    <a class="hdr__tel" href="{TEL}">{ic('phone')}{PHONE}</a>
    {btn('Free quote', 'quote.html', 'btn--light btn--sm hdr__cta')}
    <button class="hdr__menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu" data-menu-btn><span></span></button>
  </div>
</header>
<div class="menu" id="menu" inert>
  <nav class="menu__list" aria-label="Mobile">
    <a href="index.html"{' aria-current="page"' if active == 'home' else ''}>Home</a>
    {''.join(f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{label}</a>' for key, href, label in NAV)}
  </nav>
  <div class="menu__foot">
    {btn('Get my free quote', 'quote.html', 'btn--gold')}
    <div><a href="{TEL}">{PHONE}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></div>
  </div>
</div>"""

def cta_band(title=None, sub=None):
    title = title or 'Book a free site check. <em>No pressure.</em>'
    sub = sub or "We look at your roof, your shade and a year of bills, then put purchase, finance and PPA numbers side by side on paper."
    band = "".join(f"<span>{w}</span><em>{e}</em>" for w, e in [("Solar", "Battery backup"), ("Three prices", "Same crew"), ("Ground mounts", "Power that shows up")])
    return f"""
<div class="marquee marquee--big" aria-hidden="true"><div class="marquee__track">{band}{band}</div></div>
<section class="cta" aria-labelledby="cta-h">
  <img class="cta__bg" src="assets/img/hero-coast-sm.webp" srcset="assets/img/hero-coast-sm.webp 900w, assets/img/hero-coast.webp 1800w" sizes="100vw" alt="" loading="lazy">
  <div class="cta__in">
    <p class="kicker kicker--dot">Schedule your free site check</p>
    <h2 class="d-xl" id="cta-h">{title}</h2>
    <p class="cta__sub">{sub}</p>
    <div class="btns btns--center">
      {btn('Book my free site check', 'quote.html', 'btn--gold btn--lg')}
      <a class="btn btn--outline-light btn--lg" href="{TEL}"><span>{PHONE}</span></a>
    </div>
    <ul class="cta__facts">
      <li><p class="kicker">Net billing</p><p><b>Power you use beats power you export.</b> Under California's current rules we size around a year of your real usage.</p></li>
      <li><p class="kicker">Three prices</p><p><b>Buy, finance or PPA.</b> All three on paper, side by side, with the assumptions written down.</p></li>
      <li><p class="kicker">One crew</p><p><b>Same people, start to finish.</b> The crew that designs it installs it and answers the phone afterward.</p></li>
    </ul>
  </div>
</section>"""

def footer():
    return f"""
<footer class="ftr">
  <div class="ftr__in">
    <div class="ftr__top">
      <div class="ftr__brand">
        <p class="kicker kicker--dot">Grover Beach, California</p>
        <p class="ftr__line">Solar, batteries and ground mounts, installed by a Central Coast crew.</p>
        {btn('Get a free quote', 'quote.html', 'btn--gold btn--sm')}
      </div>
      <div>
        <h4>Solar</h4>
        <ul><li><a href="services.html#homes">Home solar</a></li><li><a href="services.html#business">Commercial solar</a></li><li><a href="services.html#battery">Battery storage</a></li><li><a href="services.html#ground">Ground mounts</a></li><li><a href="payment-options.html">Buy · Finance · PPA</a></li></ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul><li><a href="about.html">About the crew</a></li><li><a href="process.html">How it works</a></li><li><a href="about.html#area">Service area</a></li><li><a href="quote.html">Free quote</a></li></ul>
      </div>
      <div>
        <h4>Contact</h4>
        <div class="ftr__contact">
          <a href="{TEL}">{PHONE}</a>
          <a href="mailto:{EMAIL}">{EMAIL}</a>
          <a href="https://maps.google.com/?q=1198+Farroll+Rd+Suite+4+Grover+Beach+CA+93433" target="_blank" rel="noopener">1198 Farroll Rd, Suite 4<br>Grover Beach, CA 93433</a>
        </div>
      </div>
    </div>
    <p class="ftr__word" aria-hidden="true">Blue Collar</p>
    <div class="ftr__bot">
      <span>© <span data-year>2026</span> Blue Collar Energy. Power that shows up.</span>
      <span>Grover Beach, CA · <span data-clock>Pacific time</span></span>
      <span>Concept by <a href="preview-pack.html">Code Bunny</a> · <a href="#main">Back to top ↑</a></span>
    </div>
  </div>
</footer>
<nav class="mbar" aria-label="Quick actions">
  <a href="{TEL}">{ic('phone')}Call</a>
  <a class="q" href="quote.html">Free quote{ic('arrow-r')}</a>
</nav>"""

def concept_badge():
    return '<a class="concept" href="preview-pack.html">Concept for Blue Collar · <b>Preview pack</b></a>'

def photo_hero(h):
    """Inner-page hero: full-bleed photo, breadcrumb, headline with a serif accent, lede and buttons,
    then a facts card overlapping the bottom edge. Written in each page as <!--HERO {json} -->."""
    img = h["img"]
    btns = "".join(btn(b[0], b[1], b[2] if len(b) > 2 else "") if (len(b) < 3 or "ghost" not in b[2])
                   else f'<a class="btn btn--outline-light" href="{b[1]}"><span>{b[0]}</span></a>' for b in h.get("btns", []))
    facts = "".join(f'<li><p class="kicker">{k}</p><b>{v}</b></li>' for k, v in h.get("facts", []))
    return f"""<section class="hero hero--page" aria-labelledby="ph-h">
  <img class="hero__bg" src="assets/img/{img}.webp" srcset="assets/img/{img}-sm.webp 900w, assets/img/{img}.webp 1800w" sizes="100vw" alt="" fetchpriority="high" style="object-position:{h.get('pos', '50% 40%')}">
  <div class="badge" aria-hidden="true">
    <svg viewBox="0 0 200 200"><defs><path id="badge-p" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs><text><textPath href="#badge-p" textLength="458">{h.get('badge', 'FREE SITE CHECK · NO PRESSURE · GROVER BEACH ·')}</textPath></text></svg>
    <img src="assets/img/logo-mark.png" alt="">
  </div>
  <div class="wrap hero__in">
    <nav class="crumb" aria-label="Breadcrumb"><a href="index.html">Home</a><i></i><span>{h['crumb']}</span></nav>
    <h1 class="d-hero d-hero--page" id="ph-h">{h['title']}</h1>
    <div class="hero__row">
      <p class="hero__lede">{h['lede']}</p>
      <div class="btns">{btns}</div>
    </div>
  </div>
</section>
<div class="wrap"><ul class="facts">{facts}</ul></div>"""

def payback(bill=220):
    """Year-by-year position of a purchased system for the default bill, written into the page
    so the chart is complete on first paint (same model as assets/js/calc.js)."""
    rate, esc, deg, yld, ppw, off = 0.40, 0.035, 0.005, 1650, 3.10, 0.80
    kwh = bill * 12 / rate
    size = max(2.4, round(kwh / yld * 10) / 10)
    cost = size * 1000 * ppw
    cum, total, first = [], -cost, None
    for t in range(1, 26):
        avoided = size * yld * (1 - deg) ** (t - 1) * rate * (1 + esc) ** (t - 1) * off
        first = first or avoided
        total += avoided
        cum.append(total)
    be = next(i + 1 for i, v in enumerate(cum) if v >= 0)
    lo, hi = min(cum), max(cum)
    span = hi - lo
    bars = "".join(
        f'<li class="{"neg" if v < 0 else "pos"}" style="--h:{abs(v) / span * 100:.1f}%" title="Year {i + 1}: {"−" if v < 0 else ""}${abs(v):,.0f}"></li>'
        for i, v in enumerate(cum))
    paid3 = min(100, round((cum[2] + cost) / cost * 100))
    return {"bars": bars, "first": f"${first:,.0f}", "paid3": f"{paid3}%", "be": be, "net": f"${cum[-1]:,.0f}",
            "netk": f"${cum[-1] / 1000:.1f}k", "zero": f"{-lo / span * 100:.1f}%", "cost": f"${cost:,.0f}"}

# Monthly-bill slider shared by the home and payment pages. Values are pre-filled for the
# default $220 bill so the numbers are right on first paint; calc.js takes over on input.
BILL = """<div class="cmp__ctrl">
        <div class="cmp__bill">
          <label for="bill-{id}">Your average monthly electric bill</label>
          <output id="bill-out-{id}" for="bill-{id}" data-bill-out>$220<small>/month</small></output>
        </div>
        <div class="cmp__slider">
          <input class="range" id="bill-{id}" type="range" min="60" max="800" step="10" value="220" data-bill aria-describedby="bill-out-{id}" style="--p:21.6%">
          <div class="range__scale"><span>$60</span><span>$800+</span></div>
        </div>
        <dl class="cmp__derived">
          <div><dt>System size</dt><dd data-v="size">4.0 kW</dd></div>
          <div><dt>kWh per year</dt><dd data-v="kwh">6,600</dd></div>
          <div><dt>Install cost</dt><dd data-v="cost">$12,400</dd></div>
        </dl>
      </div>"""

TOWNS = ('<ul class="towns"><li class="towns__hq">' + ic("pin") + 'Grover Beach · HQ</li>' +
         "".join(f"<li>{t}</li>" for t in ["Pismo Beach", "Arroyo Grande", "San Luis Obispo", "Santa Maria", "Oceano", "Nipomo", "Avila Beach"]) + "</ul>")

MAP = """<figure class="map">
      <svg viewBox="30 92 460 352" role="img" aria-label="Map of the Central Coast service area, centered on Grover Beach">
        <path class="map__land" d="M500 0H215c-12 40-6 70-28 104-16 26-46 36-58 66-10 24 4 52-4 80-8 30-34 44-40 74-6 30 10 60 4 92-4 26-22 52-26 94h437z"/>
        <path class="map__coast" d="M215 0c-12 40-6 70-28 104-16 26-46 36-58 66-10 24 4 52-4 80-8 30-34 44-40 74-6 30 10 60 4 92-4 26-22 52-26 94"/>
        <circle class="map__reach" cx="205" cy="268" r="170"/>
        <g class="map__routes"><path d="M205 268 Q203 186 262 130"/><path d="M205 268 Q199 224 162 198"/><path d="M205 268 Q208 250 196 236"/><path d="M205 268 Q225 258 246 266"/><path d="M205 268 Q196 281 200 296"/><path d="M205 268 Q248 289 262 336"/><path d="M205 268 Q279 326 286 420"/></g>
        <text class="map__sea" x="46" y="132">Pacific</text><text class="map__sea" x="46" y="150">Ocean</text>
        <g class="map__town"><circle cx="262" cy="130" r="4.5"/><text x="273" y="134">San Luis Obispo</text></g>
        <g class="map__town"><circle cx="162" cy="198" r="4"/><text x="173" y="202">Avila Beach</text></g>
        <g class="map__town"><circle cx="196" cy="236" r="4"/><text x="207" y="240">Pismo Beach</text></g>
        <g class="map__town"><circle cx="246" cy="266" r="4"/><text x="257" y="270">Arroyo Grande</text></g>
        <g class="map__town"><circle cx="200" cy="296" r="4"/><text x="211" y="300">Oceano</text></g>
        <g class="map__town"><circle cx="262" cy="336" r="4"/><text x="273" y="340">Nipomo</text></g>
        <g class="map__town"><circle cx="286" cy="420" r="4.5"/><text x="297" y="424">Santa Maria</text></g>
        <g class="map__hq"><circle cx="205" cy="268" r="8"/><rect x="54" y="254" width="128" height="28" rx="4"/><text x="118" y="273" text-anchor="middle">Grover Beach</text></g>
      </svg>
    </figure>"""

ASKCARD = f"""<div class="ask-card">
        <span class="ask-card__ic">{ic('phone')}</span>
        <div><b>Still have a question?</b><p>Call or email the crew. A real person picks up, and it's the same people who'd do the work.</p>
        <div class="btns"><a class="btn btn--gold btn--sm" href="{TEL}"><span>Call {PHONE}</span><i class="btn__ic">{ic('arrow-r')}</i></a><a class="btn btn--ghost btn--sm" href="mailto:{EMAIL}"><span>Email us</span></a></div></div>
      </div>"""

def wait_chart(bill=220):
    """Cumulative spend over 25 years: utility only vs a purchased system (same model as calc.js)."""
    rate, esc, deg, yld, ppw, off = 0.40, 0.035, 0.005, 1650, 3.10, 0.80
    kwh = bill * 12 / rate
    size = max(2.4, round(kwh / yld * 10) / 10)
    cost = size * 1000 * ppw
    U, S = [0.0], [cost]
    for t in range(1, 26):
        b = kwh * rate * (1 + esc) ** (t - 1)
        avoided = size * yld * (1 - deg) ** (t - 1) * rate * (1 + esc) ** (t - 1) * off
        U.append(U[-1] + b); S.append(S[-1] + b - avoided)
    W, H, pl, pr, pt, pb = 1000, 400, 70, 190, 20, 40
    hi = max(U) * 1.05
    x = lambda i: pl + (W - pl - pr) * i / 25
    y = lambda v: pt + (H - pt - pb) * (1 - v / hi)
    line = lambda a: "M" + " L".join(f"{x(i):.1f} {y(v):.1f}" for i, v in enumerate(a))
    area = line(U) + " L" + " L".join(f"{x(i):.1f} {y(v):.1f}" for i, v in reversed(list(enumerate(S)))) + " Z"
    grid = "".join(f'<line x1="{pl}" x2="{W - pr}" y1="{y(v):.1f}" y2="{y(v):.1f}"/><text x="{pl - 12}" y="{y(v) + 4:.1f}" text-anchor="end">${v / 1000:.0f}k</text>' for v in range(0, int(hi), 20000))
    xs = "".join(f'<text x="{x(i):.1f}" y="{H - 12}" text-anchor="middle">{"Today" if i == 0 else "Yr " + str(i)}</text>' for i in (0, 5, 10, 15, 20, 25))
    keep = U[-1] - S[-1]
    mid = (y(U[-1]) + y(S[-1])) / 2
    return f"""<div class="wait">
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="Cumulative spend over 25 years: about ${U[-1]:,.0f} paying the utility versus about ${S[-1]:,.0f} with a purchased solar system">
        <g class="wait__grid">{grid}{xs}</g>
        <path class="wait__gap" d="{area}"/>
        <path class="wait__line wait__line--u" d="{line(U)}" pathLength="1"/>
        <path class="wait__line wait__line--s" d="{line(S)}" pathLength="1"/>
        <circle class="wait__dot wait__dot--u" cx="{x(25):.1f}" cy="{y(U[-1]):.1f}" r="6"/>
        <circle class="wait__dot wait__dot--s" cx="{x(25):.1f}" cy="{y(S[-1]):.1f}" r="6"/>
        <g class="wait__lab"><text x="{x(25) + 16:.1f}" y="{y(U[-1]) + 5:.1f}">Utility only</text><text class="v" x="{x(25) + 16:.1f}" y="{y(U[-1]) + 25:.1f}">${U[-1]:,.0f}</text>
        <text x="{x(25) + 16:.1f}" y="{y(S[-1]) - 16:.1f}">With solar</text><text class="v" x="{x(25) + 16:.1f}" y="{y(S[-1]) + 4:.1f}">${S[-1]:,.0f}</text></g>
        <g class="wait__keep"><path d="M{x(25) - 14:.1f} {y(U[-1]) + 10:.1f} V {y(S[-1]) - 10:.1f}"/><text x="{x(25) - 26:.1f}" y="{mid + 5:.1f}" text-anchor="end">You keep ${keep:,.0f}</text></g>
      </svg>
      <ul class="wait__legend"><li><i class="lg wait__lg--u"></i>Keep paying the utility (rates +3.5% a year)</li><li><i class="lg wait__lg--s"></i>Buy the system once, pay only what solar doesn't cover</li></ul>
    </div>"""

PARTIALS = {"{{towns}}": TOWNS, "{{map}}": MAP, "{{askcard}}": ASKCARD, "{{wait}}": wait_chart()}

def build():
    out = []
    pb = payback()
    for p in sorted(PAGES.glob("*.html")):
        src = p.read_text()
        m = re.match(r"\s*<!--META (.*?)-->\s*", src, re.S)
        meta = json.loads(m.group(1))
        body = src[m.end():]
        body = re.sub(r"<!--HERO (.*?)-->", lambda mm: photo_hero(json.loads(mm.group(1))), body, flags=re.S)
        body = re.sub(r"\{\{btn:([^|}]+)\|([^|}]+)\|?([^}]*)\}\}", lambda mm: btn(mm.group(1), mm.group(2), mm.group(3)), body)
        body = re.sub(r"\{\{ic:([a-z-]+)(?::([a-z-_ ]+))?\}\}", lambda mm: ic(mm.group(1), mm.group(2) or ""), body)
        body = re.sub(r"<img (?![^>]*decoding=)", '<img decoding="async" ', body)  # decode off the main thread
        for k, v in PARTIALS.items():
            body = body.replace(k, v)
        for k, v in pb.items():
            body = body.replace("{{pb:" + k + "}}", str(v))
        body = body.replace("{{bill}}", BILL.replace("{id}", p.stem)).replace("{{PHONE}}", PHONE).replace("{{TEL}}", TEL).replace("{{EMAIL}}", EMAIL).replace("{{ADDR}}", ADDR)
        cta = cta_band(meta.get("cta_title"), meta.get("cta_sub")) if meta.get("cta", True) else ""
        scripts = "".join(f'<script src="assets/js/{s}.js" defer></script>' for s in ["site", "motion"] + meta.get("scripts", []))
        html = (head(meta) + f'\n<body class="{meta.get("body", "")}">\n' + sprite() + covers() + header(meta.get("nav", "")) +
                f'\n<main id="main">\n{body}\n{cta}\n</main>' + footer() +
                (concept_badge() if meta.get("badge", True) else "") + f"\n{scripts}\n</body>\n</html>\n")
        (ROOT / p.name).write_text(html)
        out.append(p.name)
    print("built:", ", ".join(out))

if __name__ == "__main__":
    build()
