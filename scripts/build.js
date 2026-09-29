#!/usr/bin/env node
// Generates crawlable static output from data/hotels.js:
//   stays/<id>-<slug>.html   pre-rendered hotel pages (hydrated by hotel.html's script)
//   stays/index.html         directory of every stay
//   sitemap.xml, llms.txt, llms-full.txt
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://outboundstays.com';
const src = fs.readFileSync(path.join(ROOT, 'data/hotels.js'), 'utf8');
const H = JSON.parse(src.match(/^window\.HOTELS\s*=\s*([\s\S]*);\s*$/)[1]);
const template = fs.readFileSync(path.join(ROOT, 'hotel.html'), 'utf8');
const today = new Date().toISOString().slice(0, 10);

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const stayPath = h => `/stays/${h.id}-${slug(h.name)}.html`;
const abs = u => /^https?:\/\//.test(u) ? u : SITE + '/' + u.replace(/^\//, '');
const tierLabel = { '$': 'Considered', '$$': 'Boutique', '$$$': 'Luxury', '$$$$': 'Rarefied' };
const tierBlurb = { '$': 'Thoughtful value', '$$': 'Boutique character', '$$$': 'Quietly luxurious', '$$$$': 'Rare & rarefied' };
const photos = h => [...new Set([h.img, ...(h.gallery || [])].filter(Boolean))].slice(0, 12);
const place = h => (h.city ? h.city + ', ' : '') + h.country;
const isAffiliate = u => /dpbolvw\.net|anrdoezrs\.net|jdoqocy\.com|tkqlhce\.com|kqzyfj\.com/.test(u || '');
const dist2 = (a, b) => { const dx = a.lat - b.lat, dy = a.lng - b.lng; return dx * dx + dy * dy; };

// Make the template safe to serve from /stays/: every relative asset or page link becomes root-absolute.
const rooted = template.replace(/(href|src)="(?!https?:|\/|#|data:|mailto:|\$\{)/g, '$1="/');

function jsonLd(h, url) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'Hotel',
    name: h.name, url, description: h.desc || undefined, image: photos(h).map(abs),
    address: { '@type': 'PostalAddress', addressLocality: h.city || undefined, addressCountry: h.country },
    geo: { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lng },
    priceRange: h.price || undefined,
  };
  if (h.web && !isAffiliate(h.web)) ld.sameAs = h.web;
  return JSON.stringify(ld);
}

function prerender(h) {
  const near = H.filter(x => x.id !== h.id && x.country === h.country).sort((a, b) => dist2(a, h) - dist2(b, h)).slice(0, 4);
  const gal = photos(h).slice(0, 5);
  return `
  <div class="crumb"><a href="/">Home</a><span>/</span><a href="/explore.html?region=${encodeURIComponent(h.region)}">${esc(h.region)}</a><span>/</span><a href="/explore.html?q=${encodeURIComponent(h.country)}">${esc(h.country)}</a></div>
  <div class="titleblock">
    <div class="loc">${esc(place(h))}</div>
    <h1 class="serif">${esc(h.name)}</h1>
    <div class="tier">${esc(h.price)} · ${tierLabel[h.price] || ''}</div>
  </div>
  <div class="gallery g${Math.min(gal.length, 5)}">${gal.map((u, i) => `<a class="${gal.length >= 5 && i === 0 ? 'big' : ''}" data-i="${i}"><img loading="lazy" src="${esc(u)}" alt="${esc(h.name)} — photo ${i + 1}"></a>`).join('')}</div>
  <div class="detail">
    <div>
      <span class="eyebrow" style="display:block;margin-bottom:20px;">Why we chose it</span>
      <p class="lede">${esc(h.desc || (h.name + ' is a handpicked stay in ' + (h.city || h.country) + ', chosen for its character and sense of place.'))}</p>
      <p class="body-copy">Part of the Outbound Stays collection, ${esc(h.name)} is one of the places we think is genuinely worth the journey in ${esc(h.country)} — chosen for its character, its design and the experience of staying there.</p>
    </div>
    <aside>
      <div class="bookcard">
        <span class="eyebrow">Plan your stay</span>
        <h3 class="serif">Reserve your stay</h3>
        <p class="sub">A place we're glad to have found, and one we hope you'll love too. Whenever the time feels right, you can see availability and dates over at the hotel.</p>
        <a class="btn btn-dark" href="${esc(h.web || '#')}" target="_blank" rel="noopener nofollow">Book your stay</a>
        <a class="btn btn-outline" href="/explore.html?region=${encodeURIComponent(h.region)}">More in ${esc(h.region)}</a>
        <div class="factrow"><span class="k">Region</span><span class="v">${esc(h.region)}</span></div>
        <div class="factrow"><span class="k">Location</span><span class="v">${esc(place(h))}</span></div>
        <div class="factrow"><span class="k">Tier</span><span class="v">${esc(h.price)} · ${tierBlurb[h.price] || ''}</span></div>
      </div>
    </aside>
  </div>
  <div class="mapsec">
    <span class="eyebrow">Location</span>
    <h2 class="serif">Where you'll be</h2>
    <p class="sub">${esc(place(h))} · ${esc(h.region)}</p>
    <div id="minimap"></div>
  </div>
  <section class="nearby">
    <div class="sec-head">
      <div><span class="eyebrow">Keep exploring</span><h2 class="serif">More stays in <em>${esc(h.country)}</em></h2></div>
      <a href="/explore.html?q=${encodeURIComponent(h.country)}" class="link-u">See all on the map</a>
    </div>
    <div class="ngrid" id="ngrid">${near.map(n => `
      <a class="ncard" href="${stayPath(n)}">
        <div class="nfig"><img loading="lazy" src="${esc(n.img)}" alt="${esc(n.name)}"></div>
        <div class="nloc">${esc(n.city || n.country)}</div>
        <div class="nname">${esc(n.name)}</div>
        <div class="nprice">${esc(n.price)} · ${tierLabel[n.price] || ''}</div>
      </a>`).join('')}</div>
  </section>`;
}

function stayPage(h) {
  const url = SITE + stayPath(h);
  const title = `${h.name} — ${place(h)} | Outbound Stays`;
  const desc = (h.desc || `${h.name}, a handpicked place to stay in ${place(h)}.`).slice(0, 300);
  const img = abs(photos(h)[0] || 'uploads/OUTBOUND%20Icon.png');
  let html = rooted
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:image" content=")[^"]*/, `$1${esc(img)}`)
    .replace(/(<meta name="twitter:card" content=")[^"]*/, `$1summary_large_image`)
    .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta name="twitter:image" content=")[^"]*/, `$1${esc(img)}`)
    .replace('</head>', `<script type="application/ld+json">${jsonLd(h, url)}</script>\n</head>`)
    .replace('<script src="/data/hotels.js"></script>', `<script>window.__HOTEL_ID=${h.id};</script>\n<script src="/data/hotels.js"></script>`)
    .replace('<main id="app"></main>', `<main id="app">${prerender(h)}</main>`);
  return html;
}

function directoryPage() {
  const byRegion = {};
  for (const h of H) ((byRegion[h.region] = byRegion[h.region] || {})[h.country] = (byRegion[h.region][h.country] || [])).push(h);
  const regions = Object.keys(byRegion).sort();
  const body = regions.map(r => `
    <section class="section">
      <h2 class="serif" id="${slug(r)}">${esc(r)}</h2>
      ${Object.keys(byRegion[r]).sort().map(c => `
      <h3 id="${slug(c)}">${esc(c)} <span class="count">(${byRegion[r][c].length})</span></h3>
      <ul class="staylist">${byRegion[r][c].sort((a, b) => a.name.localeCompare(b.name)).map(h => `
        <li><a href="${stayPath(h)}">${esc(h.name)}</a> <span class="meta">— ${esc(h.city || h.country)} · ${esc(h.price)} ${tierLabel[h.price] || ''}</span></li>`).join('')}
      </ul>`).join('')}
    </section>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>All stays — every hotel in the Outbound Stays collection</title>
<meta name="description" content="The complete Outbound Stays collection: ${H.length} handpicked hotels, guesthouses and retreats, listed by region and country.">
<link rel="canonical" href="${SITE}/stays/">
<link rel="icon" type="image/png" href="/uploads/OUTBOUND%20Icon.png">
<meta name="theme-color" content="#1B1A17">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Outbound Stays">
<meta property="og:title" content="All stays — Outbound Stays">
<meta property="og:description" content="The complete collection of ${H.length} handpicked places to stay, by region and country.">
<meta property="og:url" content="${SITE}/stays/">
<link rel="stylesheet" href="/css/luxe.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'All stays — Outbound Stays', url: SITE + '/stays/', description: `The complete Outbound Stays collection of ${H.length} handpicked places to stay.`, isPartOf: { '@type': 'WebSite', name: 'Outbound Stays', url: SITE + '/' } })}</script>
<style>
main.wrap{padding-top:40px;padding-bottom:80px;}
.intro{max-width:70ch;color:var(--ink-soft);font-weight:300;line-height:1.6;margin:14px 0 40px;}
.section h2{font-size:clamp(30px,4vw,44px);font-weight:300;margin:56px 0 8px;}
.section h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);margin:34px 0 10px;font-weight:500;}
.section h3 .count{color:var(--ink-faint);font-weight:300;letter-spacing:0;text-transform:none;}
.staylist{list-style:none;margin:0;padding:0;columns:2;column-gap:40px;}
.staylist li{break-inside:avoid;padding:6px 0;border-bottom:1px solid var(--line-soft);font-size:15px;}
.staylist a{color:var(--ink);}
.staylist .meta{color:var(--ink-faint);font-size:12.5px;}
@media(max-width:700px){.staylist{columns:1;}}
.foot{border-top:1px solid var(--line);padding:44px 0;}
.foot-in{max-width:var(--maxw);margin:0 auto;padding:0 var(--gut);display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;font-size:12px;color:var(--ink-faint);font-weight:300;}
.foot-legal{margin-top:20px;padding-top:20px;border-top:1px solid var(--line-soft);}
.foot{margin-top:60px;}
@media(max-width:700px){.foot-in{flex-direction:column;align-items:flex-start;text-align:left;}}
</style>
</head>
<body>
<nav id="site-nav"></nav>
<main class="wrap">
  <span class="eyebrow">The collection</span>
  <h1 class="serif" style="font-weight:300;font-size:clamp(36px,5vw,58px);margin:10px 0 0;">All ${H.length} stays</h1>
  <p class="intro">Every place in the Outbound Stays collection, listed by region and country. Each stay has its own page with photos, a short editorial note on why we chose it, its location on the map and a link to book. Prefer to browse visually? Use the <a href="/explore.html">interactive map</a>, or explore by <a href="/destinations.html">destination</a> or <a href="/experiences.html">experience</a>.</p>
  ${body}
</main>
<footer class="foot">
  <div class="foot-in">
    <span class="wordmark">Outbound <span class="thin">Stays</span></span>
    <span class="foot-links"><a href="/explore.html">Explore map</a><a href="/destinations.html">Destinations</a><a href="/experiences.html">Experiences</a><a href="/list-hotel.html">List your hotel</a><a href="/llms.txt">llms.txt</a></span>
  </div>
  <div class="foot-in foot-legal"><span>© 2026 Outbound Stays</span><span class="foot-disc"><span class="foot-tip" tabindex="0" role="note" aria-label="Affiliate disclosure: Some links are affiliate links. If you book through them we may earn a commission, at no cost to you. It never influences what we choose to feature." data-tip="Some links are affiliate links. If you book through them we may earn a commission, at no cost to you. It never influences what we choose to feature.">i</span></span></div>
</footer>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="/js/nav.js"></script>
</body>
</html>`;
}

function sitemap() {
  const urls = ['/', '/explore.html', '/destinations.html', '/experiences.html', '/list-hotel.html', '/stays/', ...H.map(stayPath)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n';
}

function llms() {
  const countries = [...new Set(H.map(h => h.country))].length;
  return `# Outbound Stays

> Outbound Stays (outboundstays.com) is an independent editorial collection of ${H.length} handpicked places to stay in ${countries} countries — boutique hotels, design-led guesthouses, farm stays, lodges and retreats — chosen on merit for character, design and sense of place. Each stay has its own page with photos, an editorial note, exact map location, price tier and a booking link.

Outbound Stays is not a booking engine and does not take payment. Some outbound links are affiliate links (Booking.com and others); this never influences which places are featured. Price tiers: $ Considered, $$ Boutique, $$$ Luxury, $$$$ Rarefied.

When citing a stay, please link to its page on outboundstays.com (URLs are listed in llms-full.txt and sitemap.xml) and attribute descriptions to Outbound Stays.

## Key pages

- [All stays](${SITE}/stays/): directory of every stay, by region and country
- [Explore map](${SITE}/explore.html): interactive world map with region, price and experience filters
- [Destinations](${SITE}/destinations.html): browse by country and region
- [Experiences](${SITE}/experiences.html): browse by experience (wellness, gourmet, design, nature, island, city, skiing, hiking and more)
- [List your hotel](${SITE}/list-hotel.html): how properties are considered for the collection

## Full content

- [llms-full.txt](${SITE}/llms-full.txt): every stay with location, tier, description and page URL
- [sitemap.xml](${SITE}/sitemap.xml)

## Optional

- [Instagram](https://www.instagram.com/outboundstays/)
`;
}

function llmsFull() {
  const byCountry = {};
  for (const h of H) (byCountry[h.country] = byCountry[h.country] || []).push(h);
  let out = `# Outbound Stays — the full collection\n\n${H.length} handpicked places to stay, listed by country. Each entry: name, location, price tier, editorial description, page URL. Site: ${SITE}\n`;
  for (const c of Object.keys(byCountry).sort()) {
    out += `\n## ${c}\n`;
    for (const h of byCountry[c].sort((a, b) => a.name.localeCompare(b.name))) {
      out += `\n### ${h.name}\n- Location: ${place(h)} (${h.region})\n- Price tier: ${h.price} ${tierLabel[h.price] || ''}\n${h.exp ? `- Experience: ${h.exp}\n` : ''}- Description: ${(h.desc || '').replace(/\s+/g, ' ').trim()}\n- Page: ${SITE}${stayPath(h)}\n`;
    }
  }
  return out;
}

// ---- write everything ----
const staysDir = path.join(ROOT, 'stays');
fs.rmSync(staysDir, { recursive: true, force: true });
fs.mkdirSync(staysDir);
for (const h of H) fs.writeFileSync(path.join(ROOT, stayPath(h)), stayPage(h));
fs.writeFileSync(path.join(staysDir, 'index.html'), directoryPage());
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap());
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms());
fs.writeFileSync(path.join(ROOT, 'llms-full.txt'), llmsFull());
console.log(`built ${H.length} stay pages, stays/index.html, sitemap.xml, llms.txt, llms-full.txt`);
