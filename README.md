# Emerging Investors Canada — website

A single-page static site. No build step, no dependencies, no framework: just
`index.html`, `styles.css` and the images in `assets/`. Open `index.html` in a
browser to preview it locally.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole page. Content lives here, split into commented sections. |
| `styles.css` | All styling. Brand tokens are CSS variables at the top. |
| `404.html` | Branded not-found page. Cloudflare serves it with a real 404 status. |
| `assets/mark.png` | Flat black `EIC` monogram — used in the header, on white. |
| `assets/logo-tile.png` | The monogram on its gradient, as a square — footer and 404. |
| `assets/favicon.png` | Browser tab icon, same tile scaled down. |
| `assets/og-image.jpg` | 1200×630 link-preview card. |
| `assets/community.jpg` | Hero photo, web-optimised from the original HEIC. |
| `brand/1–5.png` | Untouched brand source art. Nothing on the site links to these. |
| `.nojekyll` | Legacy GitHub Pages marker — see the note at the bottom. |

Everything in `assets/` is derived from `brand/` with `sips`, so it can be
regenerated. `brand/` is kept separate so the served folder holds only files the
site actually references.

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

Live at **<https://emerginginvestors.pages.dev>**, deployed from the `main`
branch of `samloucks/EIC-website`. Cloudflare rebuilds on every push, so
`git push` is the whole deploy process — about 75 seconds from push to live.

Project settings, for reference:

| Setting | Value |
| --- | --- |
| Project name | `emerginginvestors` (this is what makes the URL) |
| Production branch | `main` |
| Framework preset | None |
| Build command | *(blank — there's nothing to build)* |
| Build output directory | `/` |

Pull requests get their own preview URL automatically, which is handy for reviewing
copy changes before they go live.

## Moving to a custom domain later

Buying the domain through **Cloudflare Registrar** keeps this to a few clicks, since
DNS is already in the same account and Registrar sells at wholesale cost. Then:

1. **Workers & Pages → emerginginvestors → Custom domains → Set up a domain**
2. Enter the apex (`emerginginvestorscanada.ca`) and repeat for `www`.
3. Cloudflare adds the DNS records and issues the certificate itself — usually a few
   minutes, no records to copy by hand.

If the domain is bought elsewhere, point its nameservers at Cloudflare first, or add
a `CNAME` for `www` → `emerginginvestors.pages.dev` at the other registrar.

Every link inside the page is relative, so the only edit the move requires is the two
absolute Open Graph URLs in `index.html` (`og:url` and `og:image`).

## The `.nojekyll` file

Only matters to GitHub Pages, which is not being used. It's harmless on Cloudflare and
worth keeping in case Pages is ever needed as a fallback host.

## Live links used on the page

- **Membership form** — <https://forms.gle/dwCPtThvG3VoUY979> (join band + footer nav)
- **Contact** — `emerginginvestorscanada@gmail.com` (footer)

## Still outstanding

- **Hero photo** — it shows identifiable people. Worth confirming everyone is fine
  with appearing on a public site.
- **`og:url` / `og:image`** — currently point at the `.pages.dev` URL. They must be
  absolute, so they need one more edit when the custom domain lands. They are the only
  place in the project that hardcodes the hostname.
- **Social links** — none on the page yet; add to the footer nav when there are
  accounts to point at.
