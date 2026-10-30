(() => {
  'use strict';

  if (window.WorkspaceAuth.isAuthenticated()) {
    window.location.replace('./dashboard.html');
    return;
  }

  const form = document.querySelector('#loginForm');
  const password = document.querySelector('#password');
  const error = document.querySelector('#loginError');
  const toggle = document.querySelector('#togglePassword');

  toggle.addEventListener('click', () => {
    const showPassword = password.type === 'password';
    password.type = showPassword ? 'text' : 'password';
    toggle.textContent = showPassword ? 'Ẩn' : 'Hiện';
    toggle.setAttribute('aria-label', showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    toggle.setAttribute('aria-pressed', String(showPassword));
    password.focus();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!window.WorkspaceAuth.login(password.value)) {
      error.textContent = 'Mật khẩu không chính xác. Vui lòng thử lại.';
      error.hidden = false;
      password.setAttribute('aria-invalid', 'true');
      password.focus();
      password.select();
      return;
    }

    error.hidden = true;
    password.removeAttribute('aria-invalid');
    window.location.assign('./dashboard.html');
  });

  password.addEventListener('input', () => {
    error.hidden = true;
    password.removeAttribute('aria-invalid');
  });
})();
