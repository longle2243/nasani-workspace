(() => {
  'use strict';

  // Change this placeholder before use. A client-side password is visible in the published source.
  const WORKSPACE_PASSWORD = 'longlenasani';
  const SESSION_KEY = 'my-workspace-authenticated';

  window.WorkspaceAuth = Object.freeze({
    isAuthenticated() {
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    },
    login(password) {
      if (password !== WORKSPACE_PASSWORD) return false;
      sessionStorage.setItem(SESSION_KEY, 'true');
      return true;
    },
    logout() {
      sessionStorage.removeItem(SESSION_KEY);
    }
  });
})();
