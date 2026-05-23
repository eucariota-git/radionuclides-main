'use strict';

const UTILS = (() => {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    escapeHtml,
  };
})();
