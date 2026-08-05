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
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. |

## Deploying with GitHub Pages

The site is served straight from the default branch — pushing to `main` publishes it.

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **`main`**, folder: **`/ (root)`**
3. Wait ~1 minute. The site appears at `https://<user>.github.io/<repo>/`.

Every later `git push` to `main` redeploys automatically.

## Moving to a custom domain later

1. Buy the domain.
2. At the registrar, add these DNS records:
   - Four `A` records for the apex (`emerginginvestorscanada.ca` →
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`)
   - One `CNAME` for `www` → `<user>.github.io`
3. **Settings → Pages → Custom domain**, enter the domain, save. GitHub writes a
   `CNAME` file into the repo.
4. Tick **Enforce HTTPS** once the certificate is issued (usually under an hour).

All links in the page are relative, so nothing needs editing when the domain changes.

## Live links used on the page

- **Membership form** — <https://forms.gle/dwCPtThvG3VoUY979> (join band + footer nav)
- **Contact** — `emerginginvestorscanada@gmail.com` (footer)

## Still outstanding

- **`og:url` / `og:image`** — the only remaining `TODO` in `index.html`. Set these to
  absolute URLs once the domain exists, so link previews render properly in Slack,
  LinkedIn and iMessage.
- **Hero photo** — it shows identifiable people. Worth confirming everyone is fine
  with appearing on a public site.
- **Social links** — none on the page yet; add to the footer nav when there are
  accounts to point at.
