/* ==========================================================================
   /directory — the searchable member list.

   Every approved profile is fetched once and filtered in the browser. For a
   community of this size that is both simpler and faster than a round trip per
   keystroke; if the directory ever reaches a few thousand members, move the
   filtering into the Postgres query with .ilike() and .range() instead.

   The three filter menus are built from the data rather than from the
   vocabulary list in config.js, so they never offer a country, role or company
   that would return nothing.
   ========================================================================== */

(function () {
  'use strict';

  const A      = window.EICAuth;
  const client = A.client;

  const form      = document.querySelector('[data-filters]');
  const results   = document.querySelector('[data-results]');
  const countEl   = document.querySelector('[data-count]');
  const emptyEl   = document.querySelector('[data-empty]');
  const clearBtn  = document.querySelector('[data-clear]');

  let members = [];
  let me      = null;


  /* --- fetching ----------------------------------------------------------- */

  async function fetchMembers() {
    /* RLS does the real gatekeeping; the explicit status filter keeps an
       admin's own view of the directory the same as everyone else's, since
       admins can read pending rows too. */
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, contact_email, phone, country, role, company, fun_facts, interests, linkedin_url')
      .eq('status', 'approved')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }


  /* --- filter menus ------------------------------------------------------- */

  function uniqueSorted(key) {
    const seen = new Map();
    members.forEach((m) => {
      const value = (m[key] || '').trim();
      if (!value) return;
      /* Case-insensitive de-duplication, keeping the first spelling seen, so
         "Inovia" and "inovia" do not become two entries in the menu. */
      const fold = value.toLowerCase();
      if (!seen.has(fold)) seen.set(fold, value);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }

  function buildFilters() {
    const menus = [
      ['country', 'All countries'],
      ['role',    'All roles'],
      ['company', 'All companies'],
    ];

    menus.forEach(([key, allLabel]) => {
      const select = form[key];
      const options = uniqueSorted(key);
      select.innerHTML =
        `<option value="">${allLabel}</option>` +
        options.map((v) => `<option value="${A.escapeHtml(v)}">${A.escapeHtml(v)}</option>`).join('');
    });
  }


  /* --- filtering ---------------------------------------------------------- */

  function currentFilters() {
    return {
      q:       form.q.value.trim().toLowerCase(),
      country: form.country.value,
      role:    form.role.value,
      company: form.company.value,
    };
  }

  function haystack(member) {
    return [
      member.full_name,
      member.company,
      member.role,
      member.country,
      member.fun_facts,
      (member.interests || []).join(' '),
    ].join(' ').toLowerCase();
  }

  function matches(member, filters) {
    if (filters.country && member.country !== filters.country) return false;
    if (filters.role    && member.role    !== filters.role)    return false;
    if (filters.company && member.company !== filters.company) return false;

    if (!filters.q) return true;
    /* Every whitespace-separated word has to appear somewhere, so "toronto
       fintech" narrows rather than widens. */
    const hay = haystack(member);
    return filters.q.split(/\s+/).every((word) => hay.includes(word));
  }

  function apply() {
    const filters = currentFilters();
    const shown = members.filter((m) => matches(m, filters));
    const filtering = !!(filters.q || filters.country || filters.role || filters.company);

    render(shown);

    countEl.textContent = filtering
      ? `${shown.length} of ${members.length} ${members.length === 1 ? 'member' : 'members'}`
      : `${members.length} ${members.length === 1 ? 'member' : 'members'}`;

    emptyEl.hidden   = shown.length > 0;
    results.hidden   = shown.length === 0;
    clearBtn.hidden  = !filtering;
  }

  function clearFilters() {
    form.reset();
    /* reset() restores the markup defaults, which for a JS-built <select> is
       whatever option carries the selected attribute — none of them — so the
       first option wins. That is the "All …" entry, which is what we want. */
    apply();
    form.q.focus();
  }


  /* --- rendering ---------------------------------------------------------- */

  function card(member) {
    const esc = A.escapeHtml;
    const bits = [];

    bits.push(`<h2 class="member-name">${esc(member.full_name)}</h2>`);
    bits.push(`<p class="member-role">${esc(member.role)} &middot; ${esc(member.company)}</p>`);
    bits.push(`<p class="member-country">${esc(member.country)}</p>`);

    if (member.fun_facts) {
      bits.push(`<p class="member-facts">${esc(member.fun_facts)}</p>`);
    }

    if (member.interests && member.interests.length) {
      bits.push(
        '<ul class="member-interests">' +
        member.interests.map((i) => `<li>${esc(i)}</li>`).join('') +
        '</ul>'
      );
    }

    const contacts = [];
    if (member.contact_email) {
      /* The address goes in as typed: percent-encoding the @ is legal in a
         mailto URI but some mail clients mishandle it. escapeHtml still closes
         off any quote that could break out of the attribute. */
      contacts.push(
        `<a href="mailto:${esc(member.contact_email)}">${esc(member.contact_email)}</a>`
      );
    }
    if (member.phone) {
      /* tel: wants the number without spaces or punctuation; the label keeps
         whatever the member typed. */
      contacts.push(
        `<a href="tel:${esc(member.phone.replace(/[^+\d]/g, ''))}">${esc(member.phone)}</a>`
      );
    }
    if (contacts.length) {
      bits.push(`<p class="member-contact">${contacts.join('')}</p>`);
    }

    const linkedin = A.safeUrl(member.linkedin_url);
    if (linkedin) {
      bits.push(
        `<a class="member-link" href="${esc(linkedin)}" target="_blank" rel="noopener">
           <svg class="member-icon" aria-hidden="true" focusable="false"><use href="#icon-linkedin"/></svg>
           LinkedIn<span class="visually-hidden"> profile for ${esc(member.full_name)}</span>
         </a>`
      );
    }

    const isMe = me && member.id === me.id;
    return `<li class="member member-card${isMe ? ' is-me' : ''}">
      ${isMe ? '<p class="member-you">You</p>' : ''}
      ${bits.join('\n      ')}
    </li>`;
  }

  function render(list) {
    results.innerHTML = list.map(card).join('');
  }


  /* --- start -------------------------------------------------------------- */

  async function init() {
    const state = await A.guard('directory');
    if (!state) return;

    me = state.profile;
    A.renderAccount(state);

    try {
      members = await fetchMembers();
    } catch (error) {
      console.error('[EIC]', error);
      A.reveal('error');
      const slot = document.querySelector('[data-gate-error]');
      if (slot) slot.textContent = 'We could not load the member list. Please refresh and try again.';
      return;
    }

    buildFilters();
    apply();
    A.reveal('directory');

    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', (event) => event.preventDefault());
    clearBtn.addEventListener('click', clearFilters);
  }

  init();
})();
