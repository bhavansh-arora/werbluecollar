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

def head(meta):
    title = meta["title"]
    return f"""<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{meta['desc']}">
<meta name="theme-color" content="#07111f">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta['desc']}">
<meta property="og:image" content="assets/img/hero-coast.webp">
<meta property="og:type" content="website">
<link rel="icon" href="assets/img/logo-mark.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..800&family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
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

def header(active, solid=False):
    links = "".join(
        f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}>{label}</a>' for key, href, label in NAV)
    return f"""
<a class="skip" href="#main">Skip to content</a>
<header class="hdr{' hdr--solid' if solid else ''}" data-hdr>
  <div class="hdr__bar">
    <a class="brand" href="index.html" aria-label="Blue Collar Energy, home">
      <span class="brand__mark"><img src="assets/img/logo-mark.png" alt="" width="40" height="40"></span>
      <span class="brand__word"><b>Blue Collar</b><small>Energy · Grover Beach</small></span>
    </a>
    <nav class="hdr__nav" aria-label="Main">{links}</nav>
    <a class="hdr__tel" href="{TEL}">{ic('phone')}{PHONE}</a>
    <a class="btn btn--volt btn--sm hdr__cta" href="quote.html">Free quote<span class="btn__ic">{ic('arrow')}</span></a>
    <button class="hdr__menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu" data-menu-btn><span></span></button>
  </div>
</header>
<div class="menu" id="menu" inert>
  <nav class="menu__list" aria-label="Mobile">
    <a href="index.html"{' aria-current="page"' if active == 'home' else ''}><span>01</span>Home</a>
    {''.join(f'<a href="{href}"{" aria-current=\"page\"" if key == active else ""}><span>0{i+2}</span>{label if key != "quote" else "Free quote"}</a>' for i, (key, href, label) in enumerate(NAV))}
  </nav>
  <div class="menu__foot">
    <a class="btn btn--volt" href="quote.html">Get my free quote<span class="btn__ic">{ic('arrow')}</span></a>
    <div><a href="{TEL}">{PHONE}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></div>
    <div>{ADDR}</div>
  </div>
</div>"""

def ticker(items=None):
    items = items or ["Free site check", "Three prices on paper", "Buy · Finance · PPA", "Permits & utility handled",
                      "Same crew, same phone number", "Grover Beach → Santa Maria"]
    inner = "".join(f'<span class="ticker__item">{t}{ic("bolt")}</span>' for t in items)
    return f'<div class="ticker" aria-hidden="true"><div class="ticker__track">{inner}</div></div>'

def cta_band(title=None, sub=None):
    title = title or 'Ready to see what your roof <span class="serif">can do?</span>'
    sub = sub or "A free site check, three prices on paper, and no pressure either way. We come back with real numbers for buying, financing or a PPA."
    return f"""
<section class="cta" aria-labelledby="cta-h">
  <svg class="cta__bolt" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>
  <div class="wrap cta__inner">
    <div>
      <span class="eyebrow"><b>Free quote</b> No obligation</span>
      <h2 class="d-xl mt-m split-line" id="cta-h">{title}</h2>
    </div>
    <div class="cta__side rv">
      <p>{sub}</p>
      <div class="btns">
        <a class="btn" href="quote.html">Start my free quote<span class="btn__ic">{ic('arrow')}</span></a>
        <a class="btn btn--ghost" href="{TEL}">Call {PHONE}</a>
      </div>
      <div class="cta__contact"><a href="mailto:{EMAIL}">{ic('mail')}{EMAIL}</a><span>Reply within one business day</span></div>
    </div>
  </div>
</section>"""

def footer(flush=False):
    return f"""
<footer class="ftr{' ftr--flush' if flush else ''}">
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">
        <a class="brand" href="index.html"><span class="brand__mark"><img src="assets/img/logo-mark.png" alt="" width="40" height="40"></span><span class="brand__word"><b>Blue Collar Energy</b><small>Solar · Batteries · Ground mounts</small></span></a>
        <p>Solar for America, designed, permitted and installed from Grover Beach, California. Honest work, plain numbers, and a crew you can call by name after the panels are up.</p>
        <a class="btn btn--volt btn--sm" href="quote.html">Get a free quote<span class="btn__ic">{ic('arrow')}</span></a>
      </div>
      <div>
        <h4>Pages</h4>
        <ul><li><a href="index.html">Home</a></li><li><a href="payment-options.html">Buy · Finance · PPA</a></li><li><a href="services.html">Services</a></li><li><a href="process.html">How it works</a></li><li><a href="about.html">About the crew</a></li><li><a href="quote.html">Free quote &amp; contact</a></li></ul>
      </div>
      <div>
        <h4>Service area</h4>
        <ul><li><a href="about.html#area">Grover Beach</a></li><li><a href="about.html#area">Pismo Beach</a></li><li><a href="about.html#area">Arroyo Grande</a></li><li><a href="about.html#area">San Luis Obispo</a></li><li><a href="about.html#area">Santa Maria</a></li><li><a href="about.html#area">The Central Coast</a></li></ul>
      </div>
      <div>
        <h4>Talk to us</h4>
        <div class="ftr__contact">
          <a href="{TEL}"><b>{PHONE}</b></a>
          <a href="mailto:{EMAIL}">{EMAIL}</a>
          <a href="https://maps.google.com/?q=1198+Farroll+Rd+Suite+4+Grover+Beach+CA+93433" target="_blank" rel="noopener">{ADDR}</a>
        </div>
      </div>
    </div>
    <div class="ftr__mega" aria-hidden="true"><span>Blue</span><span>Collar</span></div>
    <div class="ftr__bot">
      <span>© <span data-year>2026</span> Blue Collar Energy · Grover Beach, California</span>
      <span>Website concept by <a href="preview-pack.html">Code Bunny</a></span>
    </div>
  </div>
</footer>
<nav class="mbar" aria-label="Quick actions">
  <a href="{TEL}">{ic('phone')}Call</a>
  <a class="q" href="quote.html">{ic('bolt')}Free quote</a>
</nav>"""

def concept_badge():
    return f'<a class="concept" href="preview-pack.html">Concept for Blue Collar <b>{ic("spark")}Preview pack</b></a>'

def build():
    out = []
    for p in sorted(PAGES.glob("*.html")):
        src = p.read_text()
        m = re.match(r"\s*<!--META (.*?)-->\s*", src, re.S)
        meta = json.loads(m.group(1))
        body = src[m.end():]
        body = re.sub(r"\{\{ic:([a-z-]+)(?::([a-z-_ ]+))?\}\}", lambda mm: ic(mm.group(1), mm.group(2) or ""), body)
        body = re.sub(r"<img (?![^>]*decoding=)", '<img decoding="async" ', body)  # decode off the main thread
        body = body.replace("{{ticker}}", ticker()).replace("{{PHONE}}", PHONE).replace("{{TEL}}", TEL).replace("{{EMAIL}}", EMAIL).replace("{{ADDR}}", ADDR)
        cta = cta_band(meta.get("cta_title"), meta.get("cta_sub")) if meta.get("cta", True) else ""
        scripts = "".join(f'<script src="assets/js/{s}.js" defer></script>' for s in ["vendor/lenis.min", "site"] + meta.get("scripts", []))
        html = (head(meta) + f'\n<body class="{meta.get("body", "")}">\n' + sprite() + header(meta.get("nav", ""), meta.get("solid", False)) +
                f'\n<main id="main">\n{body}\n{cta}\n</main>' + footer(flush=not cta) +
                (concept_badge() if meta.get("badge", True) else "") + f"\n{scripts}\n</body>\n</html>\n")
        (ROOT / p.name).write_text(html)
        out.append(p.name)
    print("built:", ", ".join(out))

if __name__ == "__main__":
    build()
