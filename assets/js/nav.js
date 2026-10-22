/* ==========================================================================
   The "Resources" dropdown in the site header.

   Progressive enhancement: the markup is a <button> plus a plain list of
   links. Without this script the list stays in the DOM and the button does
   nothing, so the pages are still navigable — both links also sit in the
   footer. With it, the button becomes a proper disclosure: aria-expanded
   tracks state, Escape closes and returns focus, and a click or a tab away
   dismisses it.

   On narrow screens the CSS centres the panel on the nav rather than on the
   button, which at that width can sit close enough to an edge to push a
   centred panel off screen.
   ========================================================================== */

(function () {
  'use strict';

  /* Populated below. open() and close() read it, and both only ever run from
     an event handler, by which time it is filled. */
  const groups = [];

  function close(group) {
    group.trigger.setAttribute('aria-expanded', 'false');
    group.menu.hidden = true;
  }

  function open(group) {
    groups.forEach((other) => { if (other !== group) close(other); });
    group.trigger.setAttribute('aria-expanded', 'true');
    group.menu.hidden = false;
  }

  function closeAllOutside(target) {
    groups.forEach((group) => {
      if (!group.root.contains(target)) close(group);
    });
  }

  document.querySelectorAll('[data-nav-group]').forEach((root) => {
    const trigger = root.querySelector('[data-nav-trigger]');
    const menu    = root.querySelector('[data-nav-menu]');
    if (!trigger || !menu) return;

    const group = { root, trigger, menu };
    groups.push(group);

    close(group);

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) close(group); else open(group);
    });

    /* Arrow-down from the trigger lands on the first link, which is what a
       menu button is expected to do. */
    trigger.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      open(group);
      const first = menu.querySelector('a');
      if (first) first.focus();
    });
  });

  if (!groups.length) return;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    groups.forEach((group) => {
      if (group.trigger.getAttribute('aria-expanded') === 'true') {
        close(group);
        group.trigger.focus();
      }
    });
  });

  document.addEventListener('click', (event) => closeAllOutside(event.target));

  /* Tabbing out closes it too — otherwise the panel is left hanging open
     behind whatever you moved on to. */
  document.addEventListener('focusin', (event) => closeAllOutside(event.target));
})();
