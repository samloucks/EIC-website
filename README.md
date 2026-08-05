# Emerging Investors Canada — website

A single-page static site. No build step, no dependencies, no framework: just
`index.html`, `styles.css` and the images in `assets/`. Open `index.html` in a
browser to preview it locally.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole page. Content lives here, split into commented sections. |
| `styles.css` | All styling. Brand colours are CSS variables at the top. |
| `assets/logo.png` | Full stacked lockup (used in the footer). |
| `assets/mark.png` | `EIC` monogram only (used in the header). |
| `assets/community.jpg` | Hero photo, web-optimised from the original HEIC. |
| `assets/favicon.png` | Browser tab icon. |
| `.nojekyll` | Legacy GitHub Pages marker — see the note at the bottom. |

## Hosting — Cloudflare (Workers static assets)

Live at **<https://emerginginvestorscanada.samloucks16.workers.dev>**, deployed from the `main`
branch of `samloucks/EIC-website`. Cloudflare rebuilds on every push, so
`git push` is the whole deploy process.

Project settings, for reference:

| Setting | Value |
| --- | --- |
| Project name | `emerginginvestorscanada` (combined with the account subdomain to make the URL) |
| Production branch | `main` |
| Framework preset | None |
| Build command | *(blank — there's nothing to build)* |
| Build output directory | `/` |

Pull requests get their own preview URL automatically, which is handy for reviewing
copy changes before they go live.

## Moving to a custom domain later

Buying the domain through **Cloudflare Registrar** keeps this to a few clicks, since
DNS is already in the same account and Registrar sells at wholesale cost. Then:

1. **Workers & Pages → emerginginvestorscanada → Custom domains → Set up a domain**
2. Enter the apex (`emerginginvestorscanada.ca`) and repeat for `www`.
3. Cloudflare adds the DNS records and issues the certificate itself — usually a few
   minutes, no records to copy by hand.

If the domain is bought elsewhere, point its nameservers at Cloudflare first, or add
a `CNAME` for `www` → `emerginginvestorscanada.samloucks16.workers.dev` at the other
registrar.

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
- **`og:url` / `og:image`** — currently point at the `.workers.dev` URL. They must be
  absolute, so they need one more edit when the custom domain lands.
- **The URL contains the account subdomain** (`samloucks16`). A custom domain is the
  clean fix; see the section above.
- **Social links** — none on the page yet; add to the footer nav when there are
  accounts to point at.
