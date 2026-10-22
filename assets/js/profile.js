/* ==========================================================================
   /profile — create or edit your own member profile.

   Reachable by any signed-in user, approved or not: it is the second step of
   signing up, and it is also where an existing member edits their details.

   The two cases are kept apart on save. A first save is an INSERT carrying the
   user id; later saves are an UPDATE that never mentions it. An upsert would
   be shorter but would ask Postgres for UPDATE privilege on `id`, which the
   schema deliberately does not grant — see the column grants in
   supabase/schema.sql.
   ========================================================================== */

(function () {
  'use strict';

  const A      = window.EICAuth;
  const client = A.client;
  const vocab  = A.vocab;

  const form      = document.querySelector('[data-form="profile"]');
  const messageEl = document.querySelector('[data-profile-message]');
  const counter   = document.querySelector('[data-counter]');

  let existing = null;   // the row as it was loaded, or null for a new profile
  let user     = null;

  function message(text, tone) {
    messageEl.textContent = text;
    messageEl.className = 'auth-message' + (tone ? ' is-' + tone : '');
    messageEl.hidden = !text;
    if (text) messageEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }


  /* --- building the form -------------------------------------------------- */

  function fillSelect(select, options, placeholder) {
    select.innerHTML =
      `<option value="">${placeholder}</option>` +
      options.map((o) => `<option value="${A.escapeHtml(o)}">${A.escapeHtml(o)}</option>`).join('');
  }

  function buildInterests() {
    const host = document.querySelector('[data-interests]');
    host.innerHTML = vocab.interests.map((interest, i) => `
      <label class="interest">
        <input type="checkbox" name="interests" value="${A.escapeHtml(interest)}" id="interest-${i}">
        <span>${A.escapeHtml(interest)}</span>
      </label>`).join('');
  }

  function buildForm() {
    fillSelect(form.role, vocab.roles, 'Select a role…');
    fillSelect(form.country, vocab.countries, 'Select a country…');
    buildInterests();

    form.fun_facts.addEventListener('input', updateCounter);
  }

  function updateCounter() {
    const used = form.fun_facts.value.length;
    counter.textContent = used ? `${used} / 600` : '';
  }


  /* --- prefilling --------------------------------------------------------- */

  function prefill(profile) {
    /* Google hands back a name and we may as well use it, so a first-time
       member is not retyping something we already know. */
    const meta = (user && user.user_metadata) || {};

    form.full_name.value     = (profile && profile.full_name)     || meta.full_name || meta.name || '';
    form.contact_email.value = (profile && profile.contact_email) || (user && user.email) || '';
    form.phone.value         = (profile && profile.phone)         || '';
    form.company.value       = (profile && profile.company)       || '';
    form.linkedin_url.value  = (profile && profile.linkedin_url)  || '';
    form.fun_facts.value     = (profile && profile.fun_facts)     || '';

    form.role.value    = (profile && profile.role)    || '';
    form.country.value = (profile && profile.country) || '';

    const chosen = new Set((profile && profile.interests) || []);
    form.querySelectorAll('input[name="interests"]').forEach((box) => {
      box.checked = chosen.has(box.value);
    });

    updateCounter();
  }


  /* --- reading the form --------------------------------------------------- */

  function collect() {
    const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked'))
      .map((box) => box.value);

    const trimmed = (name) => form[name].value.trim();

    return {
      full_name:     trimmed('full_name'),
      contact_email: trimmed('contact_email'),
      /* Empty optional text goes in as NULL rather than '' so the directory
         can test for a value with a plain truthiness check. */
      phone:         trimmed('phone')        || null,
      country:       trimmed('country'),
      role:          trimmed('role'),
      company:       trimmed('company'),
      fun_facts:     trimmed('fun_facts')    || null,
      linkedin_url:  trimmed('linkedin_url') || null,
      interests,
    };
  }

  function validate(values) {
    const required = {
      full_name:     'Please enter your name.',
      contact_email: 'Please enter a contact email address.',
      company:       'Please enter the company you work at.',
      role:          'Please choose your role.',
      country:       'Please choose your country.',
    };

    for (const [field, complaint] of Object.entries(required)) {
      if (!values[field]) {
        form[field].focus();
        return complaint;
      }
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.contact_email)) {
      form.contact_email.focus();
      return 'That contact email does not look right.';
    }

    if (values.linkedin_url && !/^https?:\/\//i.test(values.linkedin_url)) {
      form.linkedin_url.focus();
      return 'Please give the full LinkedIn address, starting with https://';
    }

    return null;
  }


  /* --- saving ------------------------------------------------------------- */

  async function onSubmit(event) {
    event.preventDefault();
    message('');

    const values = collect();
    const complaint = validate(values);
    if (complaint) { message(complaint, 'error'); return; }

    const button = form.querySelector('[data-submit]');
    button.disabled = true;
    const idle = button.textContent;
    button.textContent = 'Saving…';

    const isNew = !existing;
    const query = isNew
      ? client.from('profiles').insert({ id: user.id, ...values })
      : client.from('profiles').update(values).eq('id', user.id);

    const { error } = await query;

    button.disabled = false;
    button.textContent = idle;

    if (error) { message(A.friendlyError(error), 'error'); return; }

    if (isNew) {
      /* Straight back to the gate, which now shows "we're reviewing you". */
      location.replace(A.path('gate'));
      return;
    }

    existing = { ...existing, ...values };
    message('Saved. Your directory entry is up to date.', 'ok');
  }


  /* --- start -------------------------------------------------------------- */

  async function init() {
    const state = await A.guard('profile');
    if (!state) return;

    user     = state.user;
    existing = state.profile;

    A.renderAccount(state);
    buildForm();
    prefill(existing);

    /* A first-time profile is framed as finishing signing up; an existing one
       is just an edit screen, and gets a way back out. */
    const title    = document.querySelector('[data-page-title]');
    const eyebrow  = document.querySelector('[data-page-eyebrow]');
    const intro    = document.querySelector('[data-form-intro]');
    const cancel   = document.querySelector('[data-cancel]');
    const submit   = form.querySelector('[data-submit]');

    if (!existing) {
      eyebrow.textContent = 'Step 2 of 2';
      title.textContent   = 'Tell us about yourself.';
      intro.textContent   =
        'This is what other members will see when they find you in the directory. ' +
        'Once you save it, an organiser reviews your application and unlocks the directory for you.';
      submit.textContent  = 'Submit for review';
    } else {
      cancel.hidden = false;
      cancel.href   = A.path(existing.status === 'approved' ? 'directory' : 'gate');
      cancel.textContent = existing.status === 'approved'
        ? 'Back to the directory'
        : 'Back';
    }

    A.reveal('form');
    form.addEventListener('submit', onSubmit);
  }

  init();
})();
