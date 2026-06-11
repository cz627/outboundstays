# Outbound Stays

The marketing & discovery site for [outboundstays.com](https://outboundstays.com) — an
editorial, affiliate-driven collection of the world's most distinctive places to stay.
Visitors browse the collection three ways: by **interactive map**, by **destination**, and
by **experience**, drill into an individual **stay detail** page, and hoteliers can **list
their property**.

It is a content/discovery site — no auth, no booking engine, no cart. Outbound links send
users to each hotel's own booking page (some via affiliate links).

## Tech

Plain, dependency-light **static HTML/CSS/JS** — no build step. Deployed to **GitHub Pages**.

```
index.html           Home
explore.html         Explore map  (mobile defaults to MAP view)
destinations.html    Browse by destination
experiences.html     Browse by experience
hotel.html           Stay detail (?id=N)
list-hotel.html      List-your-hotel acquisition page
404.html             Styled not-found page
css/luxe.css         Global design system / tokens
js/nav.js            Shared nav, mobile menu, follow popover, newsletter modal
data/hotels.js       Full hotel dataset (window.HOTELS, ~1,470 entries)
uploads/             Experience cover images + brand icon
```

Third-party libs are loaded from CDN at runtime: Leaflet 1.9.4, Leaflet.markercluster
1.5.3, qrcodejs 1.0.0. Fonts (Cormorant Garamond, Hanken Grotesk) load via Google Fonts.

## Run locally

No build needed — serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes the repository
root to GitHub Pages. The custom domain is set via the `CNAME` file (`outboundstays.com`).

**One-time setup:** in the repo's **Settings → Pages**, set **Source = GitHub Actions**.

## Notes / future work

- **Hotel imagery** in `data/hotels.js` is hotlinked from remote CDNs and may be
  unreliable; `js/nav.js` hides any image that fails to load. For production, re-host or
  proxy hotel photos.
- **Data source**: `data/hotels.js` exposes the dataset as a global `window.HOTELS`. A
  natural next step is moving this to a CMS or build-time data import.
- The newsletter and "list your hotel" forms post to Formspree.
