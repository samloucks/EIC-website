/* ==========================================================================
   Shared auth + routing for the member-only pages.

   Loaded by members.html, profile.html, directory.html and admin.html, after
   the Supabase UMD bundle and config.js. Exposes window.EICAuth.

   The four pages are one flow, and this file is the only place that knows the
   order of it:

       /members    the gate — sign in, or see "we're reviewing you"
       /profile    fill in your details (every signed-in user may reach this)
       /directory  the searchable list (approved members only)
       /admin      approve or decline pending members (admins only)

   Each page calls EICAuth.guard('<name>') once on load. It either hands back
   the signed-in state for that page to render, or redirects and returns null.
   ========================================================================== */

(function () {
  'use strict';

  const cfg = window.EIC_CONFIG || {};

  /* Has anyone actually filled in config.js yet? Checked so the pages can show
     a useful setup notice instead of a stack trace on a fresh clone. */
  const configured =
    !!cfg.supabaseUrl &&
    !!cfg.supabaseAnonKey &&
    !/YOUR-(PROJECT|ANON-KEY)/.test(cfg.supabaseUrl + cfg.supabaseAnonKey);

  const client = (configured && window.supabase)
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          /* PKCE is the flow Supabase recommends for browser apps: the
             provider hands back a short-lived ?code= which the client
             exchanges for a session, so no token is ever in the URL bar.
             detectSessionInUrl does that exchange for us on page load. */
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;


  /* --- routing ------------------------------------------------------------
     Cloudflare Pages strips .html, so the live URLs are extensionless. A plain
     `python3 -m http.server` does not, so previewing off disk needs the
     extension. Mirroring whatever the current page used keeps both working. */

  const ROUTES = {
    gate:      '/members',
    profile:   '/profile',
    directory: '/directory',
    admin:     '/admin',
  };

  const usesExtension = location.pathname.endsWith('.html');

  function path(route) {
    const p = ROUTES[route] || route;
    if (p === '/' || p.includes('#')) return p;
    return usesExtension ? p + '.html' : p;
  }

  /* replace() rather than assign() — a redirect away from a page you were
     never allowed to see should not sit in the back-button history. */
  function go(route) {
    location.replace(path(route));
  }


  /* --- reading the current member ---------------------------------------- */

  async function load() {
    if (!client) return { ok: false, reason: 'unconfigured' };

    const { data: { session }, error } = await client.auth.getSession();
    if (error) return { ok: false, reason: 'error', error };
    if (!session) return { ok: true, session: null, user: null, profile: null };

    /* maybeSingle, not single: a user who has signed in but not yet filled in
       the form has no row, and that is an expected state, not an error. */
    const { data, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      return { ok: false, reason: 'error', error: profileError, session, user: session.user };
    }

    return { ok: true, session, user: session.user, profile: data || null };
  }


  /* --- the gate ----------------------------------------------------------- */

  async function guard(page) {
    const state = await load();

    if (!state.ok) {
      showFatal(state);
      return null;
    }

    const { session, profile } = state;

    /* Everything but the gate needs a session at minimum. */
    if (page !== 'gate' && !session) {
      go('gate');
      return null;
    }

    switch (page) {
      case 'gate':
        if (!session) return state;                            // show sign-in
        if (!profile) { go('profile'); return null; }          // finish signing up
        if (profile.status === 'approved') { go('directory'); return null; }
        return state;                                          // pending / declined

      case 'profile':
        return state;                                          // any signed-in user

      case 'directory':
        if (!profile) { go('profile'); return null; }
        if (profile.status !== 'approved') { go('gate'); return null; }
        return state;

      case 'admin':
        if (!profile || !profile.is_admin) { go('gate'); return null; }
        return state;

      default:
        return state;
    }
  }


  /* --- shared chrome ------------------------------------------------------ */

  /* Every app page starts with a .gate-loading panel showing and its real
     content hidden, so nothing flashes before we know who is looking. */
  function reveal(id) {
    document.querySelectorAll('[data-gate-view]').forEach((el) => {
      el.hidden = el.dataset.gateView !== id;
    });
  }

  function showFatal(state) {
    const message = state.reason === 'unconfigured'
      ? 'The member directory is not connected to its database yet. ' +
        'Add your Supabase project URL and anon key to assets/js/config.js.'
      : 'Something went wrong talking to the member database. ' +
        'Please refresh, or get in touch if it keeps happening.';

    reveal('error');
    const slot = document.querySelector('[data-gate-error]');
    if (slot) slot.textContent = message;
    if (state.error) console.error('[EIC]', state.error);
  }

  /* The "Signed in as … / Sign out" strip in the header of the app pages. */
  function renderAccount(state) {
    const slot = document.querySelector('[data-account]');
    if (!slot || !state || !state.session) return;

    const name = (state.profile && state.profile.full_name) || state.user.email;
    const links = [];

    if (state.profile && state.profile.status === 'approved') {
      links.push(`<a href="${path('directory')}">Directory</a>`);
    }
    if (state.profile) {
      links.push(`<a href="${path('profile')}">My profile</a>`);
    }
    if (state.profile && state.profile.is_admin) {
      links.push(`<a href="${path('admin')}">Approvals</a>`);
    }

    slot.innerHTML =
      `<span class="account-name">${escapeHtml(name)}</span>` +
      links.join('') +
      '<button type="button" class="account-signout" data-signout>Sign out</button>';

    slot.hidden = false;
    slot.querySelector('[data-signout]').addEventListener('click', signOut);
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    go('gate');
  }


  /* --- small helpers ------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* Only http(s) links are ever rendered as hrefs. The profile form already
     rejects anything else, but a row edited straight in the Supabase dashboard
     bypasses that, and `javascript:` in an href is all it would take. */
  function safeUrl(value) {
    if (!value) return null;
    return /^https?:\/\//i.test(String(value).trim()) ? String(value).trim() : null;
  }

  /* Supabase error messages are written for developers. These are the ones a
     member can actually hit, in words that tell them what to do next. */
  function friendlyError(error) {
    if (!error) return 'Something went wrong. Please try again.';
    const raw = (error.message || String(error));
    const map = [
      [/invalid login credentials/i,       'That email and password combination does not match an account.'],
      [/email not confirmed/i,             'Check your inbox and click the confirmation link before signing in.'],
      [/user already registered/i,         'There is already an account with that email. Try signing in instead.'],
      /* Deliberately no number: the client asks for 8, but this fires on the
         server's own minimum, which is configured in Supabase and may differ.
         Naming a figure here would eventually contradict one of the two. */
      [/password should be at least/i,     'That password is too short. Please choose a longer one.'],
      [/unable to validate email/i,        'That does not look like a valid email address.'],
      [/rate limit|too many requests/i,    'Too many attempts just now. Please wait a minute and try again.'],
      [/duplicate key|already exists/i,    'You already have a profile — try reloading the page.'],
      [/only admins/i,                     'You do not have permission to do that.'],
    ];
    for (const [pattern, friendly] of map) if (pattern.test(raw)) return friendly;
    return raw;
  }

  window.EICAuth = {
    client,
    configured,
    guard,
    load,
    path,
    go,
    reveal,
    renderAccount,
    signOut,
    escapeHtml,
    friendlyError,
    safeUrl,
    vocab: window.EIC_VOCAB || { roles: [], countries: [], interests: [] },
  };
})();
