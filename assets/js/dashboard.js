(() => {
  'use strict';

  if (!window.WorkspaceAuth.isAuthenticated()) {
    window.location.replace('./index.html');
    return;
  }

  document.body.classList.remove('auth-pending');
  document.querySelector('#logoutButton').addEventListener('click', () => {
    window.WorkspaceAuth.logout();
    window.location.replace('./index.html');
  });
})();
