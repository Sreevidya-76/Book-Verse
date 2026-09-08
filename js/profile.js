
(function () {
  'use strict';

  function init() {
    const page = document.getElementById('profilePage');
    if (!page) return;
    if (!BV.requireAuth()) return;

    const user = BV.getCurrentUser();
    if (!user) return;

    renderProfile(user);
    bindEditProfile(user);
    bindChangePassword();
    bindPersonalDetails(user);
    renderActivity();
  }

  function renderProfile(user) {
    document.getElementById('profileAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    const created = new Date(user.createdAt);
    document.getElementById('profileSince').textContent = created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  }

  function bindEditProfile(user) {
    const form = document.getElementById('editProfileForm');
    if (!form) return;
    form.name.value = user.name;
    form.email.value = user.email;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = BV.updateProfile({ name: form.name.value.trim(), email: form.email.value.trim() });
      if (!res.ok) { BV.showToast(res.error, 'error'); return; }
      BV.showToast('Profile updated successfully', 'success');
      renderProfile(res.user);
      BV.mountChrome();
    });
  }

  function bindChangePassword() {
    const form = document.getElementById('changePwForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = form.current.value;
      const next = form.next.value;
      const conf = form.confirm.value;
      if (next.length < 6) { BV.showToast('Password must be at least 6 characters', 'error'); return; }
      if (next !== conf) { BV.showToast('Passwords do not match', 'error'); return; }
      const res = BV.changePassword(cur, next);
      if (!res.ok) { BV.showToast(res.error, 'error'); return; }
      BV.showToast('Password changed successfully', 'success');
      form.reset();
    });
  }

  function bindPersonalDetails(user) {
    const form = document.getElementById('personalDetailsForm');
    if (!form) return;
    const key = `bookVersePersonalDetails_${user.email.toLowerCase()}`;
    const saved = BV.read(key, { name: user.name, phone: '', gender: '', college: '', city: '', address: '' });
    Object.keys(saved).forEach((field) => { if (form[field]) form[field].value = saved[field] || ''; });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const details = Object.fromEntries(new FormData(form).entries());
      BV.write(key, details);
      BV.showToast('Personal details saved', 'success');
    });
  }


  function renderActivity() {
    const libCount = BV.getLibrary().length;
    const orderCount = BV.getOrders().length;
    const searchCount = BV.getSearchHistory().length;

    const el = document.getElementById('activityStats');
    if (el) {
      el.innerHTML = `
        <a class="cat-card" href="library.html"><span class="cat-emoji">📚</span><div><h4>${libCount}</h4><span>Library books</span></div></a>
        <a class="cat-card" href="orders.html"><span class="cat-emoji">📦</span><div><h4>${orderCount}</h4><span>Orders placed</span></div></a>
        <a class="cat-card" href="books.html"><span class="cat-emoji">🔍</span><div><h4>${searchCount}</h4><span>Recent searches</span></div></a>`;
    }

    const histEl = document.getElementById('searchHistoryList');
    if (histEl) {
      const hist = BV.getSearchHistory();
      if (hist.length === 0) {
        histEl.innerHTML = `<p class="muted" style="padding:10px 0">No recent searches yet.</p>`;
      } else {
        histEl.innerHTML = hist.slice(0, 8).map(s =>
          `<div class="recent-chip" style="justify-content:space-between">
            <a href="books.html?q=${encodeURIComponent(s.term)}" style="color:inherit">${BV.escapeHtml(s.term)}</a>
            <button class="rm" data-rm="${BV.escapeHtml(s.term)}" aria-label="Remove">×</button>
          </div>`
        ).join('') + `<button class="btn btn-ghost btn-sm" id="clearHistory" style="margin-top:10px">Clear all history</button>`;
        histEl.addEventListener('click', (e) => {
          if (e.target.id === 'clearHistory') {
            BV.showModal({
              title: 'Clear search history',
              message: 'This will remove all your saved searches. Continue?',
              confirmText: 'Clear all',
              danger: true,
              onConfirm: () => { BV.clearSearchHistory(); renderActivity(); BV.showToast('Search history cleared', 'info'); },
            });
          }
          const rm = e.target.closest('[data-rm]');
          if (rm) { BV.removeSearchHistory(rm.dataset.rm); renderActivity(); }
        });
      }
    }
  }

  BV.ready(init);
})();
