# Emerging Investors Canada — website

A static site with no build step. The public pages are plain HTML and CSS with
no framework: `index.html`, `styles.css` and the images in `assets/`.

The member directory added on top of that is the one part with a dependency. It
needs a free Supabase project for sign-in and for storing member profiles, and
it loads the Supabase client from a CDN. Everything else still works with the
directory unconfigured — the member pages just show a setup notice.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The home page. Content lives here, split into commented sections. |
| `team.html` | The team page, served at `/team`. |
| `code-of-conduct.html` | Community code of conduct, served at `/code-of-conduct`. |
| `styles.css` | All styling for every page. Brand tokens are CSS variables at the top. |
| `404.html` | Branded not-found page. Cloudflare serves it with a real 404 status. |
| `functions/_middleware.js` | 301s the retired `pages.dev` hostname. See below. |
| `assets/mark.png` | Flat black `EIC` monogram — used in the header, on white. |
| `assets/logo-tile.png` | The monogram on its gradient, as a square — footer and 404. |
| `assets/favicon.png` | Browser tab icon, same tile scaled down. |
| `assets/og-image.jpg` | 1200×630 link-preview card. |
| `assets/marquee.jpg` | Hero photo, 2000×1399, ~500KB. Cropped to 2:1 by CSS. |
| `assets/team/*.jpg` | Team headshots, 700×700, 55–105KB each. |
| `brand/1–5.png` | Untouched brand source art. Nothing on the site links to these. |
| `brand/headshots/*.png` | Original 1200×1200 headshots as supplied. |
| `brand/photos/*` | Full-resolution originals of the hero photos. |
| `members.html` | The gate at `/members`: sign in, or "we're reviewing you". |
| `profile.html` | Create or edit your own member profile. |
| `directory.html` | The searchable member list. Approved members only. |
| `admin.html` | Approve or decline applications. Organisers only. |
| `assets/js/config.js` | **Your Supabase URL and anon key go here**, plus the role, country and interest lists. |
| `assets/js/auth.js` | Shared session handling and the routing between the four member pages. |
| `assets/js/nav.js` | The "Resources" dropdown in the header. |
| `assets/js/members.js` `profile.js` `directory.js` `admin.js` | One controller per member page. |
| `supabase/schema.sql` | The database table, row-level security policies and approval function. Run once in Supabase. |
| `supabase/verify.sql` | Read-only checks that the schema and its privileges are right. Run after `schema.sql`. |
| `.nojekyll` | Legacy GitHub Pages marker — see the note at the bottom. |

Everything in `assets/` is derived from `brand/` with `sips`, so it can be
regenerated. `brand/` is kept separate so the served folder holds only files the
site actually references.

## Pages and URLs

| File | URL |
| --- | --- |
| `index.html` | `/` |
| `team.html` | `/team` |
| `code-of-conduct.html` | `/code-of-conduct` |
| `members.html` | `/members` |
| `profile.html` | `/profile` |
| `directory.html` | `/directory` |
| `admin.html` | `/admin` |
| `404.html` | any unmatched path, with a 404 status |

The four member pages carry `<meta name="robots" content="noindex, nofollow">`
and no canonical tag, so they stay out of search results.

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
   If there is no LinkedIn URL, drop the whole `<a class="member-link">` block —
   the card lays out correctly without it.

Cards appear in document order; there is no sorting. `sam-loucks.jpg` is spelled
out because `samuel.jpg` is already Samuel Wang.

## Member directory

Gated at `/members`. The flow is: sign in with Google or an email address, fill
in a profile, wait for an organiser to approve it, then search the directory.

### How access works

Every member is one row in `public.profiles` with a `status` of `pending`,
`approved` or `declined`. New signups start `pending` and see a "we're reviewing
your profile" screen; only `approved` members can load the directory.

Two things enforce that, and it is worth knowing which one actually matters:

1. `assets/js/auth.js` redirects people away from pages they should not see.
   This is **convenience only** — anyone can edit JavaScript in their browser.
2. The row-level security policies in `supabase/schema.sql` decide what the
   database will hand out, whatever the browser asks for. **This is the real
   boundary.** A pending member querying the profiles table gets back their own
   row and nothing else.

Members cannot approve themselves. `status` and `is_admin` are never granted to
the `authenticated` role, so no amount of crafted requests can set them — the
only route is `set_member_status()`, which checks for an admin first. Approving
someone therefore means being an admin, and the first admin is made by hand in
the SQL editor.

### Setting it up

1. **Create a Supabase project** at <https://supabase.com> (the free tier is
   ample). From **Project Settings → API**, copy the Project URL and the
   `anon` `public` key. Both are safe to commit — the `service_role` key is the
   secret one and is not used here.

2. **Create the table.** Open **SQL Editor → New query**, paste the whole of
   `supabase/schema.sql`, and run it. You want "Success. No rows returned."

   Then run `supabase/verify.sql` the same way. Every row must say **PASS** —
   in particular *Members CANNOT write status or is_admin*, which is what stops
   someone approving their own application. Do not put the site live until it
   passes.

   One result that looks alarming but is not: `status` and `is_admin` do show up
   in `information_schema.column_privileges` for signed-in members, with
   `privilege_type = 'SELECT'`. That is correct — the app reads your own status
   to decide whether you are approved. Only INSERT or UPDATE on those two
   columns would be a problem, and that is what the check tests for.

3. **Make a Google OAuth client.** In the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   go to **APIs & Services → Credentials → Create credentials → OAuth client
   ID**, pick **Web application**, and set the authorised redirect URI to:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   Copy the client ID and client secret.

4. **Enable Google in Supabase.** **Authentication → Providers → Google**:
   turn it on and paste in the client ID and secret.

5. **Set the redirect URLs.** **Authentication → URL Configuration**:

   | Field | Value |
   | --- | --- |
   | Site URL | `https://emerginginvestors.ca` |
   | Redirect URLs | `https://emerginginvestors.ca/**` and `http://localhost:8790/**` |

   Without the localhost entry, signing in against a local preview fails.

6. **Fill in `assets/js/config.js`** with the Project URL and anon key, then
   commit and push. Cloudflare redeploys in about 75 seconds.

7. **Make yourself an admin.** Sign up on the live site so your row exists,
   then run this in the SQL editor with your own address:

   ```sql
   update public.profiles set is_admin = true, status = 'approved'
    where contact_email = 'you@example.com';
   ```

   `/admin` then works for you, and you can approve everyone else from there.

### Day to day

Applications pile up at **`/admin`**, oldest first, showing everything the
applicant entered. Approve and they can use the directory immediately; decline
and they get a note pointing them at the contact address. Declining asks for
confirmation first. You cannot change your own status from that page, which
stops an organiser locking themselves out.

### Worth knowing

- **Email deliverability.** Supabase's built-in email sender is rate-limited to
  a handful of messages per hour and is meant for testing. Before any real
  intake, add your own SMTP under **Authentication → Emails → SMTP Settings**,
  or confirmation and password-reset mail will silently stop arriving.
- **Email confirmation** is on by default (**Authentication → Providers →
  Email**). Leaving it on is the right call: it stops people signing up with an
  address that is not theirs.
- **The directory loads every approved member at once** and filters in the
  browser. That is the right trade at community scale. Past a few thousand
  members, move the filtering into the query in `assets/js/directory.js` with
  `.ilike()` and `.range()`.
- **Changing the role, country or interest lists** is just editing
  `assets/js/config.js`. The directory's filter menus are built from what
  members actually chose, so they never offer an option that returns nothing.
  Renaming an option does not rewrite profiles already saved under the old name.
- **Contact details are only ever visible to approved members.** They are not in
  the HTML — they arrive from the database after sign-in — so they are not
  exposed to search engines or scrapers.

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
