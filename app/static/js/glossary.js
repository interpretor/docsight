/* glossary.js — Click-to-open popovers for DOCSIS term explanations */

(function () {
  'use strict';

  function closeAll() {
    document.querySelectorAll('.glossary-hint.open').forEach(function (el) {
      el.classList.remove('open');
    });
  }

  function positionPopover(hint) {
    var pop = hint.querySelector('.glossary-popover');
    if (!pop) return;
    pop.classList.remove('above');
    var rect = pop.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 80) {
      pop.classList.add('above');
    }
  }

  document.addEventListener('click', function (e) {
    var hint = e.target.closest('.glossary-hint');
    if (hint) {
      e.preventDefault();
      e.stopPropagation();
      var wasOpen = hint.classList.contains('open');
      closeAll();
      if (!wasOpen) {
        hint.classList.add('open');
        positionPopover(hint);
      }
      return;
    }
    closeAll();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });
})();
