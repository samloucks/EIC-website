/**
 * Sends the retired *.pages.dev hostname to the real domain with a 301.
 *
 * Cloudflare permanently attaches a <project>.pages.dev subdomain to every
 * Pages project and gives no way to remove it, so the next best thing is to
 * make it a permanent redirect rather than a second live copy of the site.
 *
 * Only the production hostname is redirected. Preview deployments are served
 * at <hash>.emerginginvestors.pages.dev, and catching those too would send
 * every PR preview to production and make them useless for review.
 *
 * This is the only server-side code in the project. Deleting this file reverts
 * the site to pure static hosting — the canonical <link> in index.html still
 * points search engines at the right domain on its own.
 */

const CANONICAL_HOST = 'emerginginvestors.ca';
const RETIRED_HOSTS = new Set(['emerginginvestors.pages.dev']);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (RETIRED_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
