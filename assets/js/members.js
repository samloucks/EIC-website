/* ==========================================================================
   /members — the gate.

   Four things can be true when someone lands here, and this file renders the
   right one: signed out (show the forms), signed in but no profile yet (auth.js
   has already redirected to /profile), signed in and pending or declined (show
   the status card), signed in and approved (auth.js has already redirected to
   /directory).

   Plus one side door: arriving from a password-reset email, flagged with
   ?reset=1 so it is decided from the URL rather than by racing an auth event.
   ========================================================================== */

(function () {
  'use strict';

  const A = window.EICAuth;
  const client = A.client;

  const card        = document.querySelector('[data-gate-view="signin"]');
  const messageEl   = document.querySelector('[data-auth-message]');
  const resetMsgEl  = document.querySelector('[data-reset-message]');
  const forms       = {
    signin: document.querySelector('[data-form="signin"]'),
    signup: document.querySelector('[data-form="signup"]'),
    reset:  document.querySelector('[data-form="reset"]'),
  };

  /* Where a provider or an email link should send people back to. Must be an
     absolute URL, and must be listed under Supabase → Authentication → URL
     Configuration → Redirect URLs. */
  function returnTo(suffix) {
    return location.origin + A.path('gate') + (suffix || '');
  }

  function say(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    el.className = 'auth-message' + (tone ? ' is-' + tone : '');
    el.hidden = !text;
  }

  const message      = (text, tone) => say(messageEl, text, tone);
  const resetMessage = (text, tone) => say(resetMsgEl, text, tone);

  function busy(form, isBusy, label) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (isBusy) {
      button.dataset.idleLabel = button.textContent;
      button.textContent = label || 'Working…';
    } else if (button.dataset.idleLabel) {
      button.textContent = button.dataset.idleLabel;
    }
    button.disabled = isBusy;
  }


  /* --- wiring ------------------------------------------------------------- */

  function wire() {
    /* Sign in / Create account toggle. */
    card.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        card.querySelectorAll('[data-mode]').forEach((other) => {
          other.setAttribute('aria-pressed', String(other.dataset.mode === mode));
        });
        forms.signin.hidden = mode !== 'signin';
        forms.signup.hidden = mode !== 'signup';
        message('');
      });
    });

    card.querySelector('[data-google]').addEventListener('click', signInWithGoogle);
    card.querySelector('[data-forgot]').addEventListener('click', sendResetEmail);

    forms.signin.addEventListener('submit', onSignIn);
    forms.signup.addEventListener('submit', onSignUp);
    forms.reset.addEventListener('submit', onChoosePassword);
  }


  /* --- Google ------------------------------------------------------------- */

  async function signInWithGoogle() {
    message('');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: returnTo() },
    });
    /* On success the browser has already navigated to Google, so only the
       failure path ever gets this far. */
    if (error) message(A.friendlyError(error), 'error');
  }


  /* --- email + password --------------------------------------------------- */

  async function onSignIn(event) {
    event.preventDefault();
    message('');

    const email    = forms.signin.email.value.trim();
    const password = forms.signin.password.value;
    if (!email || !password) {
      message('Please enter both your email and your password.', 'error');
      return;
    }

    busy(forms.signin, true, 'Signing in…');
    const { error } = await client.auth.signInWithPassword({ email, password });
    busy(forms.signin, false);

    if (error) { message(A.friendlyError(error), 'error'); return; }

    /* Reload through the gate so the routing in auth.js decides where this
       person actually belongs. */
    location.replace(A.path('gate'));
  }

  async function onSignUp(event) {
    event.preventDefault();
    message('');

    const email    = forms.signup.email.value.trim();
    const password = forms.signup.password.value;
    const confirm  = forms.signup.confirm.value;

    if (!email)                 { message('Please enter an email address.', 'error'); return; }
    if (password.length < 8)    { message('Please choose a password of at least 8 characters.', 'error'); return; }
    if (password !== confirm)   { message('Those two passwords do not match.', 'error'); return; }

    busy(forms.signup, true, 'Creating account…');
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: returnTo() },
    });
    busy(forms.signup, false);

    if (error) { message(A.friendlyError(error), 'error'); return; }

    /* With email confirmation switched on, signUp returns no session and
       Supabase deliberately returns a user with no identities when the address
       is already taken. Both get the same neutral wording — saying "that email
       is already registered" would turn this form into an account checker. */
    if (data && data.session) {
      location.replace(A.path('gate'));
      return;
    }

    forms.signup.reset();
    message(
      'Almost there — we sent a confirmation link to ' + email +
      '. Click it, then come back and sign in.',
      'ok'
    );
  }

  async function sendResetEmail() {
    const email = forms.signin.email.value.trim();
    if (!email) {
      message('Type your email address in the field above, then press this again.', 'error');
      forms.signin.email.focus();
      return;
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: returnTo('?reset=1'),
    });

    /* Same message either way, so this cannot be used to find out which
       addresses have accounts. */
    if (error) console.error('[EIC]', error);
    message('If there is an account for ' + email + ', a reset link is on its way.', 'ok');
  }

  async function onChoosePassword(event) {
    event.preventDefault();
    resetMessage('');

    const password = forms.reset.password.value;
    const confirm  = forms.reset.confirm.value;

    if (password.length < 8)  { resetMessage('Please choose a password of at least 8 characters.', 'error'); return; }
    if (password !== confirm) { resetMessage('Those two passwords do not match.', 'error'); return; }

    busy(forms.reset, true, 'Saving…');
    const { error } = await client.auth.updateUser({ password });
    busy(forms.reset, false);

    if (error) { resetMessage(A.friendlyError(error), 'error'); return; }

    location.replace(A.path('gate'));
  }


  /* --- what to show ------------------------------------------------------- */

  async function initPasswordReset() {
    /* detectSessionInUrl has already swapped the recovery code for a session
       by the time getSession resolves. No session means the link was stale or
       had been used once already. */
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
      A.reveal('signin');
      message('That reset link has expired or was already used. Request a new one below.', 'error');
      return;
    }
    A.reveal('reset');
  }

  async function init() {
    if (!A.configured || !client) {
      /* guard() renders the setup notice for us. */
      await A.guard('gate');
      return;
    }

    wire();

    if (new URLSearchParams(location.search).get('reset') === '1') {
      await initPasswordReset();
      return;
    }

    const state = await A.guard('gate');
    if (!state) return;                       // guard redirected; stop here

    A.renderAccount(state);

    if (!state.session) { A.reveal('signin'); return; }

    const profile = state.profile;
    if (profile && profile.status === 'declined') { A.reveal('declined'); return; }

    const emailSlot = document.querySelector('[data-pending-email]');
    if (emailSlot) {
      emailSlot.textContent = (profile && profile.contact_email) || state.user.email;
    }
    const editLink = document.querySelector('[data-edit-profile]');
    if (editLink) editLink.href = A.path('profile');

    A.reveal('pending');
  }

  init();
})();
