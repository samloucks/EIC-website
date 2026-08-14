# Emerging Investors Canada — website

A single-page static site. No build step, no dependencies, no framework: just
`index.html`, `styles.css` and the images in `assets/`. Open `index.html` in a
browser to preview it locally.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The home page. Content lives here, split into commented sections. |
| `team.html` | The team page, served at `/team`. |
| `styles.css` | All styling for every page. Brand tokens are CSS variables at the top. |
| `404.html` | Branded not-found page. Cloudflare serves it with a real 404 status. |
| `functions/_middleware.js` | 301s the retired `pages.dev` hostname. See below. |
| `assets/mark.png` | Flat black `EIC` monogram — used in the header, on white. |
| `assets/logo-tile.png` | The monogram on its gradient, as a square — footer and 404. |
| `assets/favicon.png` | Browser tab icon, same tile scaled down. |
| `assets/og-image.jpg` | 1200×630 link-preview card. |
| `assets/community.jpg` | Hero photo, web-optimised from the original HEIC. |
| `assets/team/*.jpg` | Founder headshots, 700×700, ~90KB each. |
| `brand/1–5.png` | Untouched brand source art. Nothing on the site links to these. |
| `brand/headshots/*.png` | Original 1200×1200 headshots as supplied. |
| `.nojekyll` | Legacy GitHub Pages marker — see the note at the bottom. |

Everything in `assets/` is derived from `brand/` with `sips`, so it can be
regenerated. `brand/` is kept separate so the served folder holds only files the
site actually references.

## Pages and URLs

| File | URL |
| --- | --- |
| `index.html` | `/` |
| `team.html` | `/team` |
| `404.html` | any unmatched path, with a 404 status |

Cloudflare Pages strips `.html` and 308-redirects `/team.html` → `/team`, so
internal links use the extensionless form. That means links like `/team` and
`/#about` resolve against the site root and **will not work when opening the HTML
straight off disk** — use a local server to preview:

```
python3 -m http.server 8790
```

Note that `python3 -m http.server` does *not* do the `.html` stripping Cloudflare
does, so locally the page is at `/team.html`, not `/team`.

## Adding someone to the team page

1. Drop the headshot in `brand/headshots/`.
2. Make the web copy — square, 700px, JPEG:
   `sips -Z 700 brand/headshots/Name.png --out /tmp/n.png && sips -s format jpeg -s formatOptions 86 /tmp/n.png --out assets/team/name.jpg`
3. Copy an existing `<li class="member">` block in `team.html` and change the
   image path, name, role and LinkedIn URL. The LinkedIn glyph is a `<symbol>`
   defined once near the top of that file, so nothing needs adding for the icon.

## Brand

**Type** — [Aileron](https://www.fontsquirrel.com/fonts/aileron), weights 300 /
400 / 600 / 700, loaded via `@font-face` in `styles.css` from jsDelivr
(`@fontsource/aileron`). Aileron is not a Google Font, so there is no Google
Fonts URL for it. To drop the third-party dependency, download the four `.woff2`
files into `assets/fonts/` and swap the `src` URLs for local paths — the rest of
the CSS needs no change.

**Colour** — the two named brand colours are `--peach: #EBBAA6` and
`--sand: #E2C696`. Both are light tints, so **neither can carry text**: `#EBBAA6`
on white is about 1.6:1, far below the 4.5:1 minimum. They are used for gradient
washes, rules, borders and hover states. Text is near-black `#0B0B0A`, matching
the ink in the logo artwork. The remaining tints (`--blush`, `--sky`, `--haze`,
`--warm`) were sampled directly out of `brand/2.png`.

**The wash** — `--wash` layers four radial gradients over a diagonal base to
reproduce the soft blooms in the source art, and `--grain` is an inline SVG
`feTurbulence` overlay that adds the film-grain texture. Any element given
`class="washed"` picks up both; the hero, join band and 404 page all use it.

**Case** — all-caps is reserved for the hero `h1` and small labels. In the source
art the only uppercase element is the org name itself, and setting every heading
in caps mangles mixed-case terms like "VCs" into "VCS".

## Hosting — Cloudflare Pages

Live at **<https://emerginginvestors.ca>**, deployed from the `main` branch of
`samloucks/EIC-website`. Cloudflare rebuilds on every push, so `git push` is the
whole deploy process — about 75 seconds from push to live.

Project settings, for reference:

| Setting | Value |
| --- | --- |
| Project name | `emerginginvestors` |
| Production branch | `main` |
| Framework preset | None |
| Build command | *(blank — there's nothing to build)* |
| Build output directory | `/` |

Pull requests get their own preview URL automatically, which is handy for reviewing
copy changes before they go live.

## The pages.dev subdomain

Cloudflare permanently attaches `emerginginvestors.pages.dev` to the project.
**There is no way to remove or disable it** — no dashboard setting, no API call.
Deleting the Pages project is the only thing that retires it, and that would take
the site down with it.

Two things keep it from behaving like a second live copy of the site:

1. `functions/_middleware.js` returns a **301** from `emerginginvestors.pages.dev`
   to `emerginginvestors.ca`, preserving path and query string. It deliberately
   matches only the production hostname — preview deployments live at
   `<hash>.emerginginvestors.pages.dev` and redirecting those would send every PR
   preview to production.
2. `index.html` carries `<link rel="canonical">` pointing at the real domain, so
   search engines consolidate on `.ca` regardless.

The middleware is the only server-side code here. Deleting the file returns the
project to pure static hosting; the canonical tag keeps working on its own.

One cost worth knowing: root middleware runs on every request, static assets
included, and each counts against the Pages Functions free allowance of 100,000
invocations per day. At roughly 7 requests per page view that is around 14,000
daily page views before it matters.

## DNS

| Record | Status |
| --- | --- |
| `emerginginvestors.ca` (apex) | Live, HTTPS, HTTP redirects up to HTTPS |
| `www.emerginginvestors.ca` | **Not configured** — does not resolve |

To add `www`: **Workers & Pages → emerginginvestors → Custom domains → Set up a
domain**, enter `www.emerginginvestors.ca`. Cloudflare writes the DNS record and
issues the certificate. Adding it is worth doing even if the apex is the address
you publish, because people type `www` out of habit.

## The `.nojekyll` file

Only matters to GitHub Pages, which is not being used. It's harmless on Cloudflare and
worth keeping in case Pages is ever needed as a fallback host.

## Live links used on the page

- **Membership form** — <https://forms.gle/dwCPtThvG3VoUY979> (join band + footer nav)
- **Contact** — `emerginginvestorscanada@gmail.com` (footer)

## Still outstanding

- **Hero photo** — it shows identifiable people. Worth confirming everyone is fine
  with appearing on a public site.
- **`www` subdomain** — not configured; see the DNS section above.
- **Social links** — none on the page yet; add to the footer nav when there are
  accounts to point at.

The hostname appears in exactly three places: `og:url`, `og:image` and the
canonical `<link>` in `index.html`, plus `CANONICAL_HOST` in
`functions/_middleware.js`.
