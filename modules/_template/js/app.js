(() => {
  'use strict';

  const message = document.querySelector('#moduleMessage');
  if (!message) {
    throw new Error('Module template is missing #moduleMessage.');
  }
})();
