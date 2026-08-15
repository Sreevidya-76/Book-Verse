/* ============================================================
   Book Verse — Authentication (login + register)
   ============================================================ */

(function () {
  'use strict';

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setFieldError(field, msg) {
    const wrap = field.closest('.field');
    if (!wrap) return;
    wrap.classList.toggle('invalid', !!msg);
    const err = wrap.querySelector('.error-msg');
    if (err) err.textContent = msg || '';
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ---------- Login ---------- */
  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    const next = getParam('next') || 'index.html';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailEl = form.email;
      const pwEl = form.password;
      let ok = true;

      if (!validateEmail(emailEl.value.trim())) { setFieldError(emailEl, 'Enter a valid email address.'); ok = false; }
      else setFieldError(emailEl, '');

      if (pwEl.value.length < 1) { setFieldError(pwEl, 'Password is required.'); ok = false; }
      else setFieldError(pwEl, '');

      if (!ok) return;

      const res = BV.loginUser(emailEl.value.trim(), pwEl.value);
      if (!res.ok) {
        BV.showToast(res.error, 'error');
        setFieldError(pwEl, res.error);
        return;
      }
      BV.showToast('Login successful! Welcome back.', 'success');
      setTimeout(() => (window.location.href = next), 700);
    });
  }

  function initForgotPassword() {
    const form = document.getElementById('forgotPasswordForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!validateEmail(email)) { setFieldError(form.email, 'Enter a valid email address.'); return; }
      setFieldError(form.email, '');
      const res = BV.requestPasswordReset(email);
      if (!res.ok) { BV.showToast(res.error, 'error'); setFieldError(form.email, res.error); return; }
      const link = document.getElementById('resetLink');
      link.href = `change-password.html?token=${encodeURIComponent(res.token)}`;
      document.getElementById('resetSent').classList.add('show');
      BV.showToast('Demo reset email created.', 'success');
    });
  }

  function initChangePassword() {
    const form = document.getElementById('changePasswordForm');
    if (!form) return;
    const token = getParam('token');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = form.password.value;
      const confirm = form.confirm.value;
      let ok = true;
      if (pw.length < 6) { setFieldError(form.password, 'Password must be at least 6 characters.'); ok = false; } else setFieldError(form.password, '');
      if (pw !== confirm) { setFieldError(form.confirm, 'Passwords do not match.'); ok = false; } else setFieldError(form.confirm, '');
      if (!ok) return;
      const res = BV.resetPassword(token, pw);
      if (!res.ok) { BV.showToast(res.error, 'error'); return; }
      BV.showToast('Password changed successfully.', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 800);
    });
  }

  /* ---------- Register ---------- */
  function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = form.name;
      const emailEl = form.email;
      const pwEl = form.password;
      const cpwEl = form.confirm;
      let ok = true;

      if (nameEl.value.trim().length < 2) { setFieldError(nameEl, 'Please enter your full name.'); ok = false; }
      else setFieldError(nameEl, '');

      if (!validateEmail(emailEl.value.trim())) { setFieldError(emailEl, 'Enter a valid email address.'); ok = false; }
      else setFieldError(emailEl, '');

      if (pwEl.value.length < 6) { setFieldError(pwEl, 'Password must be at least 6 characters.'); ok = false; }
      else setFieldError(pwEl, '');

      if (cpwEl.value !== pwEl.value) { setFieldError(cpwEl, 'Passwords do not match.'); ok = false; }
      else setFieldError(cpwEl, '');

      if (!ok) return;

      const res = BV.registerUser({
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        password: pwEl.value,
      });
      if (!res.ok) {
        BV.showToast(res.error, 'error');
        setFieldError(emailEl, res.error);
        return;
      }
      BV.showToast('Account created successfully! Welcome to Book Verse.', 'success');
      setTimeout(() => (window.location.href = 'index.html'), 800);
    });
  }

  BV.ready(() => {
    initLogin();
    initRegister();
    initForgotPassword();
    initChangePassword();
  });
})();
