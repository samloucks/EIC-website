/* ==========================================================================
   /admin — approve or decline member applications.

   Only reachable with profiles.is_admin, enforced twice over: auth.js bounces
   anyone else off the page, and set_member_status() in the database refuses to
   run for a non-admin regardless of what the browser sends. The first is
   convenience, the second is the actual security boundary.
   ========================================================================== */

(function () {
  'use strict';

  const A      = window.EICAuth;
  const client = A.client;

  const messageEl = document.querySelector('[data-admin-message]');
  const GROUPS    = ['pending', 'approved', 'declined'];

  let everyone = [];
  let me       = null;

  function message(text, tone) {
    messageEl.textContent = text;
    messageEl.className = 'auth-message' + (tone ? ' is-' + tone : '');
    messageEl.hidden = !text;
  }

  const dateFormat = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });


  /* --- data --------------------------------------------------------------- */

  async function fetchAll() {
    /* Oldest application first, so the queue is answered in the order it
       arrived. */
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function setStatus(id, status, button) {
    const row = everyone.find((m) => m.id === id);
    if (!row) return;

    /* Declining is the one that stings if it is a misclick. */
    if (status === 'declined' &&
        !window.confirm(`Decline ${row.full_name}? They will lose access to the directory.`)) {
      return;
    }

    const buttons = button.closest('.admin-actions').querySelectorAll('button');
    buttons.forEach((b) => { b.disabled = true; });
    message('');

    const { error } = await client.rpc('set_member_status', {
      target: id,
      new_status: status,
    });

    if (error) {
      buttons.forEach((b) => { b.disabled = false; });
      message(A.friendlyError(error), 'error');
      return;
    }

    row.status = status;
    render();
    message(`${row.full_name} is now ${status}.`, 'ok');
  }


  /* --- rendering ---------------------------------------------------------- */

  function actions(member) {
    const buttons = [];
    if (member.status !== 'approved') {
      buttons.push(`<button type="button" class="btn btn-sm" data-action="approved" data-id="${member.id}">Approve</button>`);
    }
    if (member.status !== 'declined') {
      buttons.push(`<button type="button" class="btn btn-sm btn-ghost" data-action="declined" data-id="${member.id}">Decline</button>`);
    }
    if (member.status !== 'pending') {
      buttons.push(`<button type="button" class="link-button" data-action="pending" data-id="${member.id}">Move back to pending</button>`);
    }

    /* An admin who declined themselves could not get back in to undo it. */
    if (me && member.id === me.id) {
      return '<p class="admin-self">This is you.</p>';
    }
    return `<div class="admin-actions">${buttons.join('')}</div>`;
  }

  function row(member) {
    const esc = A.escapeHtml;
    const details = [];

    details.push(`<p class="member-role">${esc(member.role)} &middot; ${esc(member.company)} &middot; ${esc(member.country)}</p>`);

    const contacts = [`<a href="mailto:${esc(member.contact_email)}">${esc(member.contact_email)}</a>`];
    if (member.phone) contacts.push(esc(member.phone));
    const linkedin = A.safeUrl(member.linkedin_url);
    if (linkedin) {
      contacts.push(`<a href="${esc(linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
    }
    details.push(`<p class="member-contact">${contacts.join('')}</p>`);

    if (member.fun_facts) details.push(`<p class="member-facts">${esc(member.fun_facts)}</p>`);

    if (member.interests && member.interests.length) {
      details.push(
        '<ul class="member-interests">' +
        member.interests.map((i) => `<li>${esc(i)}</li>`).join('') +
        '</ul>'
      );
    }

    const applied = member.created_at
      ? `<p class="admin-date">Applied ${dateFormat.format(new Date(member.created_at))}</p>`
      : '';

    return `<li class="admin-row">
      <div class="admin-row-main">
        <h3 class="member-name">${esc(member.full_name)}${member.is_admin ? ' <span class="admin-badge">Organiser</span>' : ''}</h3>
        ${details.join('\n        ')}
        ${applied}
      </div>
      ${actions(member)}
    </li>`;
  }

  function render() {
    GROUPS.forEach((group) => {
      const list  = document.querySelector(`[data-list="${group}"]`);
      const empty = document.querySelector(`[data-empty="${group}"]`);
      const tally = document.querySelector(`[data-tally="${group}"]`);
      const rows  = everyone.filter((m) => m.status === group);

      tally.textContent = rows.length;
      list.innerHTML = rows.map(row).join('');
      list.hidden  = rows.length === 0;
      empty.hidden = rows.length > 0;
    });
  }


  /* --- start -------------------------------------------------------------- */

  async function init() {
    const state = await A.guard('admin');
    if (!state) return;

    me = state.profile;
    A.renderAccount(state);

    try {
      everyone = await fetchAll();
    } catch (error) {
      console.error('[EIC]', error);
      A.reveal('error');
      const slot = document.querySelector('[data-gate-error]');
      if (slot) slot.textContent = 'We could not load the applications. Please refresh and try again.';
      return;
    }

    render();
    A.reveal('admin');

    /* One delegated listener rather than rebinding after every render. */
    document.querySelector('[data-gate-view="admin"]').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      setStatus(button.dataset.id, button.dataset.action, button);
    });
  }

  init();
})();
