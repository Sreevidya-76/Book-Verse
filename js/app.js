/* ============================================================
   Book Verse — Core Application JS
   Shared utilities: storage, theme, toast, modal, header/footer
   rendering, Open Library API, cart/library helpers, auth guards.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- Storage keys ---------- */
  const KEYS = {
    users: 'bookVerseUsers',
    current: 'bookVerseCurrentUser',
    libraryBase: 'bookVerseLibrary',
    cartBase: 'bookVerseCart',
    ordersBase: 'bookVerseOrders',
    searchHistBase: 'bookVerseSearchHistory',
    theme: 'bookVerseTheme',
    prefsBase: 'bookVersePrefs',
  };

  /* ---------- Safe localStorage helpers ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) { /* quota or disabled */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (_) { /* noop */ }
  }

  /* ---------- User-specific keys ---------- */
  function userSuffix() {
    const u = getCurrentUser();
    return u ? u.email.toLowerCase() : 'guest';
  }
  function libraryKey() { return `${KEYS.libraryBase}_${userSuffix()}`; }
  function cartKey() { return `${KEYS.cartBase}_${userSuffix()}`; }
  function ordersKey() { return `${KEYS.ordersBase}_${userSuffix()}`; }
  function searchHistKey() { return `${KEYS.searchHistBase}_${userSuffix()}`; }

  /* ---------- Auth ---------- */
  function getUsers() { return read(KEYS.users, []); }
  function saveUsers(users) { write(KEYS.users, users); }
  function getCurrentUser() { return read(KEYS.current, null); }
  function setCurrentUser(user) {
    if (user) write(KEYS.current, user);
    else remove(KEYS.current);
  }

  function registerUser({ name, email, password }) {
    const users = getUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return { ok: false, error: 'An account with this email already exists.' };
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name,
      email,
      password, // demo only — never do this in production
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    const session = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    setCurrentUser(session);
    return { ok: true, user: session };
  }

  function loginUser(email, password) {
    const users = getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { ok: false, error: 'Invalid email or password.' };
    const session = { id: found.id, name: found.name, email: found.email, createdAt: found.createdAt };
    setCurrentUser(session);
    return { ok: true, user: session };
  }

  function logoutUser() { setCurrentUser(null); }

  function updateProfile({ name, email }) {
    const session = getCurrentUser();
    if (!session) return { ok: false, error: 'Not logged in.' };
    const users = getUsers();
    const idx = users.findIndex(u => u.id === session.id);
    if (idx === -1) return { ok: false, error: 'User not found.' };
    if (email && email.toLowerCase() !== session.email.toLowerCase()) {
      const dup = users.some(u => u.id !== session.id && u.email.toLowerCase() === email.toLowerCase());
      if (dup) return { ok: false, error: 'That email is already in use.' };
    }
    users[idx].name = name || users[idx].name;
    users[idx].email = email || users[idx].email;
    saveUsers(users);
    const updated = { ...session, name: users[idx].name, email: users[idx].email };
    setCurrentUser(updated);
    return { ok: true, user: updated };
  }

  function requestPasswordReset(email) {
    const user = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, error: 'No account was found for that email.' };
    const token = 'demo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    write('bookVerseResetToken', { token, userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });
    return { ok: true, token };
  }

  function resetPassword(token, next) {
    const reset = read('bookVerseResetToken', null);
    if (!reset || reset.token !== token || reset.expiresAt < Date.now()) return { ok: false, error: 'This reset link is invalid or expired.' };
    const users = getUsers();
    const idx = users.findIndex(u => u.id === reset.userId);
    if (idx === -1) return { ok: false, error: 'Account not found.' };
    users[idx].password = next;
    saveUsers(users);
    remove('bookVerseResetToken');
    return { ok: true };
  }

  function changePassword(current, next) {
    const session = getCurrentUser();
    if (!session) return { ok: false, error: 'Not logged in.' };
    const users = getUsers();
    const idx = users.findIndex(u => u.id === session.id);
    if (idx === -1) return { ok: false, error: 'User not found.' };
    if (users[idx].password !== current) return { ok: false, error: 'Current password is incorrect.' };
    users[idx].password = next;
    saveUsers(users);
    return { ok: true };
  }

  /* ---------- Theme ---------- */
  function getTheme() { return localStorage.getItem(KEYS.theme) || 'light'; }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEYS.theme, theme);
    const toggle = document.querySelector('[data-theme-toggle] .t-ic');
    if (toggle) toggle.textContent = theme === 'dark' ? '☀' : '☾';
  }
  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }
  function initTheme() { applyTheme(getTheme()); }

  /* ---------- Toast ---------- */
  function ensureToastWrap() {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }
  function showToast(message, type = 'success', duration = 3000) {
    const wrap = ensureToastWrap();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    t.innerHTML = `<span class="t-ic">${icon}</span><span>${escapeHtml(message)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade-out');
      setTimeout(() => t.remove(), 260);
    }, duration);
  }

  /* ---------- Modal ---------- */
  function showModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, danger }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const btnClass = danger ? 'btn btn-danger' : 'btn';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h3 id="modal-title">${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button class="${btnClass}" data-act="ok">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 220);
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.act === 'cancel') close();
      if (e.target.dataset.act === 'ok') { close(); onConfirm && onConfirm(); }
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  /* ---------- HTML escape ---------- */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- Open Library API ---------- */
  const API = 'https://openlibrary.org';
  const searchCache = {};

  function getCoverUrl(coverId, size = 'L') {
    if (!coverId) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  }
  function getCoverByIsbn(isbn, size = 'L') {
    if (!isbn) return null;
    return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
  }

  async function searchBooks(query, page = 1, limit = 20, params = {}) {
    const q = encodeURIComponent(query || '*');
    const cacheKey = `${q}|${page}|${limit}|${JSON.stringify(params)}`;
    if (searchCache[cacheKey]) return searchCache[cacheKey];

    const url = new URL(`${API}/search.json`);
    url.searchParams.set('q', query || '*');
    url.searchParams.set('page', page);
    url.searchParams.set('limit', limit);
    if (params.fields) url.searchParams.set('fields', params.fields);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Unable to fetch books');
    const data = await res.json();
    searchCache[cacheKey] = data;
    return data;
  }

  async function getWorkDetails(key) {
    const cleanKey = key.startsWith('/works/') ? key : `/works/${key}`;
    const res = await fetch(`${API}${cleanKey}.json`);
    if (!res.ok) throw new Error('Unable to fetch book details');
    return res.json();
  }

  async function getEditionDetails(isbn) {
    const res = await fetch(`${API}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (!res.ok) throw new Error('Unable to fetch edition');
    const data = await res.json();
    return data[`ISBN:${isbn}`] || null;
  }

  /* ---------- Demo price ---------- */
  function generatePrice(book) {
    const year = book.first_publish_year || 2000;
    const base = 299 + ((year % 7) * 50);
    // deterministic per-book variation using title length
    const vary = ((book.title || '').length % 4) * 25;
    return base + vary;
  }
  function formatPrice(n) { return '₹' + n.toLocaleString('en-IN'); }

  /* ---------- Demo rating ---------- */
  function generateRating(book) {
    const seed = (book.cover_i || 0) + (book.title || '').length;
    return Math.round(((seed % 30) / 10 + 3) * 10) / 10; // 3.0 - 5.0
  }
  function starsHtml(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let s = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) s += '★';
      else if (i === full && half) s += '⯨';
      else s += '☆';
    }
    return s;
  }

  /* ---------- Book normalization ---------- */
  function normalizeBook(raw) {
    const coverId = raw.cover_i || null;
    const isbn = raw.isbn && (Array.isArray(raw.isbn) ? raw.isbn[0] : raw.isbn) || null;
    return {
      key: raw.key || null,
      title: raw.title || 'Untitled',
      author: (raw.author_name && raw.author_name[0]) || 'Unknown Author',
      authors: raw.author_name || [],
      year: raw.first_publish_year || null,
      publisher: (raw.publisher && raw.publisher[0]) || null,
      publishers: raw.publisher || [],
      language: (raw.language && (Array.isArray(raw.language) ? raw.language[0] : raw.language)) || null,
      isbn,
      coverId,
      coverUrl: getCoverUrl(coverId) || getCoverByIsbn(isbn) || null,
      pages: raw.number_of_pages_median || null,
      subjects: raw.subject ? raw.subject.slice(0, 8) : [],
      edition_key: raw.edition_key || [],
      price: generatePrice(raw),
      rating: generateRating(raw),
    };
  }

  /* ---------- Library ---------- */
  function getLibrary() { return read(libraryKey(), []); }
  function saveLibrary(lib) { write(libraryKey(), lib); }
  function isBookInLibrary(bookKey) {
    if (!bookKey) return false;
    return getLibrary().some(b => b.key === bookKey);
  }
  function addToLibrary(book) {
    if (!getCurrentUser()) return false;
    const lib = getLibrary();
    if (lib.some(b => b.key === book.key)) return false;
    lib.push({ ...book, addedAt: Date.now() });
    saveLibrary(lib);
    return true;
  }
  function removeFromLibrary(bookKey) {
    const lib = getLibrary().filter(b => b.key !== bookKey);
    saveLibrary(lib);
  }

  /* ---------- Cart ---------- */
  function getCart() { return read(cartKey(), []); }
  function saveCart(cart) { write(cartKey(), cart); }
  function getCartCount() {
    return getCart().reduce((n, i) => n + i.quantity, 0);
  }
  function addToCart(book, qty = 1) {
    if (!getCurrentUser()) return false;
    const cart = getCart();
    const existing = cart.find(i => i.key === book.key);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ ...book, quantity: qty });
    }
    saveCart(cart);
  }
  function removeFromCart(bookKey) {
    saveCart(getCart().filter(i => i.key !== bookKey));
  }
  function updateCartQuantity(bookKey, qty) {
    const cart = getCart();
    const item = cart.find(i => i.key === bookKey);
    if (item) {
      item.quantity = Math.max(1, qty);
      saveCart(cart);
    }
  }
  function clearCart() { saveCart([]); }
  function calculateCartTotal() {
    const items = getCart();
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = subtotal > 999 ? 100 : 0;
    const delivery = subtotal === 0 ? 0 : (subtotal > 499 ? 0 : 50);
    const total = subtotal - discount + delivery;
    return { subtotal, discount, delivery, total, count: items.reduce((n, i) => n + i.quantity, 0) };
  }

  /* ---------- Orders ---------- */
  function getOrders() { return read(ordersKey(), []); }
  function saveOrder(order) {
    const orders = getOrders();
    orders.unshift(order);
    write(ordersKey(), orders);
  }
  function generateOrderId() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `BV${ymd}${rand}`;
  }

  /* ---------- Search history ---------- */
  function getSearchHistory() { return read(searchHistKey(), []); }
  function saveSearchHistory(list) { write(searchHistKey(), list); }
  function addSearchHistory(term) {
    const t = (term || '').trim();
    if (!t) return;
    let hist = getSearchHistory().filter(s => s.toLowerCase() !== t.toLowerCase());
    hist.unshift({ term: t, at: Date.now() });
    hist = hist.slice(0, 12);
    saveSearchHistory(hist);
  }
  function removeSearchHistory(term) {
    saveSearchHistory(getSearchHistory().filter(s => s.term !== term));
  }
  function clearSearchHistory() { saveSearchHistory([]); }

  /* ---------- Auth guard ---------- */
  function requireAuth(redirect) {
    if (!getCurrentUser()) {
      const r = redirect || 'login.html';
      window.location.href = `${r}?next=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }
    return true;
  }

  /* ---------- Header / Footer render ---------- */
  function navIcon(key) {
    const map = {
      'index.html': '🏠',
      'books.html': '📚',
      'cat': '🏷️',
      'library.html': '🔖',
      'cart.html': '🛒',
      'about': 'ℹ️',
    };
    return map[key] || '📄';
  }

  function renderHeader() {
    const user = getCurrentUser();
    const cartCount = getCartCount();
    const themeIcon = getTheme() === 'dark' ? '☀' : '☾';
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = [
      { href: 'index.html', label: 'Home', key: 'index.html' },
      { href: 'books.html', label: 'Books', key: 'books.html' },
      ...(user ? [{ href: 'library.html', label: 'My Library', key: 'library.html' }] : []),
      { href: 'index.html#about', label: 'About', key: 'about' },
      { href: 'contact.html', label: 'Contact', key: 'contact.html' },
    ];
    const navHtml = navItems.map(n =>
      `<a href="${n.href}" class="${path === n.key || (n.key === 'cat' && path === 'books.html' && window.location.hash === '#categories') ? 'active' : ''}">${n.label}</a>`
    ).join('');

    const authHtml = user
      ? `<a href="profile.html" class="avatar-btn" aria-label="Profile">
           <span class="avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</span>
           <span class="desktop-only">${escapeHtml(user.name.split(' ')[0])}</span>
         </a>
         <button class="icon-btn desktop-only" data-act="logout" title="Logout" aria-label="Logout">↪</button>`
      : `<a href="login.html" class="btn btn-ghost btn-sm desktop-only">Login</a>`;

    return `
    <header class="site-header">
      <div class="container header-inner">
        <button class="hamburger" data-hamburger aria-label="Open navigation menu" aria-expanded="false"><span></span><span></span><span></span></button>
        <a href="index.html" class="logo">
          <span class="logo-mark">📖</span>
          <span>Book Verse</span>
        </a>
        <nav class="nav" aria-label="Primary">
          ${navHtml}
        </nav>
        <div class="header-spacer"></div>
        <div class="header-actions">

          <button class="icon-btn theme-toggle" data-theme-toggle title="Toggle theme" aria-label="Toggle theme"><span class="t-ic">${themeIcon}</span></button>
          ${user ? `<a href="cart.html" class="icon-btn" title="Cart" aria-label="Cart">
            🛒
            <span class="cart-count ${cartCount === 0 ? 'empty' : ''}">${cartCount}</span>
          </a>` : ''}
          ${authHtml}
        </div>
      </div>
      <div class="mobile-backdrop" id="mobileBackdrop"></div>
      <div class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div class="mobile-menu-header">
          <a href="index.html" class="logo"><span class="logo-mark">📖</span><span>Book Verse</span></a>
          <button class="mobile-menu-close" data-menu-close aria-label="Close menu">✕</button>
        </div>
        <nav class="mobile-menu-nav" aria-label="Mobile">
          ${navItems.map(n => `<a href="${n.href}" class="${path === n.key ? 'active' : ''}"><span class="nav-ic">${navIcon(n.key)}</span>${n.label}</a>`).join('')}
          <a href="orders.html"><span class="nav-ic">📦</span>My Orders</a>
        </nav>
        <div class="mobile-menu-section">
          ${user
            ? `<div class="mobile-user"><span class="avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</span><div class="mu-info"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div></div><div class="mobile-actions"><a href="profile.html" class="btn btn-ghost">My Profile</a><button class="btn btn-danger" data-act="logout">Logout</button></div>`
            : `<div class="section-label">Account</div><div class="mobile-actions"><a href="login.html" class="btn btn-ghost">Login</a><a href="register.html" class="btn">Register</a></div>`}
        </div>
      </div>
    </header>`;
  }

  function renderFooter() {
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="index.html" class="logo">
              <span class="logo-mark">📖</span>
              <span>Book Verse</span>
            </a>
            <p>Discover books and build your personal library. A smart book discovery and personal library platform for readers.</p>
            <div class="social-row" aria-label="Social links">
              <a href="https://www.youtube.com" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg></a>
              <a href="https://www.linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 3.5A2.2 2.2 0 1 1 .8 3.5a2.2 2.2 0 0 1 4.4 0ZM1.1 8h4.2v13H1.1V8Zm6.8 0h4v1.8h.1a4.4 4.4 0 0 1 4-2.2c4.3 0 5.1 2.8 5.1 6.4V21h-4.2v-6.2c0-1.5 0-3.5-2.1-3.5s-2.4 1.6-2.4 3.4V21H7.9V8Z"/></svg></a>
              <a href="https://wa.me" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.2 1.6 6L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.2-3.5-8.4Zm-8.4 18.2h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.5 4.7Zm5.4-7.3c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-2.2-1.1-3.6-2-4.9-4.4-.4-.6.4-.6.9-1.9.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.1 3.1c.1.2 2 3.1 4.9 4.3 2.8 1.2 2.8.8 3.3.8s1.8-.7 2-1.4c.3-.7.3-1.3.2-1.4Z"/></svg></a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 12 16.5a4.5 4.5 0 0 1 0-9Zm0 2A2.5 2.5 0 1 0 12 14.5a2.5 2.5 0 0 0 0-5ZM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg></a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Quick Links</h4>
            <a href="index.html">Home</a>
            <a href="books.html">Books</a>
            <a href="books.html#categories">Categories</a>
            <a href="library.html">My Library</a>
            <a href="cart.html">Cart</a>
          </div>
          <div class="footer-col">
            <h4>Support</h4>
            <a href="index.html#about">About</a>
            <a href="contact.html">Contact</a>
            <a href="privacy-policy.html">Privacy Policy</a>
            <a href="terms.html">Terms &amp; Conditions</a>
          </div>
          <div class="footer-col">
            <h4>Account</h4>
            <a href="login.html">Login</a>
            <a href="register.html">Register</a>
            <a href="profile.html">Profile</a>
            <a href="orders.html">My Orders</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Book Verse. All Rights Reserved.</span>
        </div>
      </div>
    </footer>`;
  }

  /* ---------- Mount shared chrome ---------- */
  function mountChrome() {
    const headerSlot = document.querySelector('[data-header]');
    const footerSlot = document.querySelector('[data-footer]');
    if (headerSlot) headerSlot.innerHTML = renderHeader();
    if (footerSlot) footerSlot.innerHTML = renderFooter();
    initTheme();
    bindChrome();
    updateCartBadge();
  }

  function bindChrome() {
    // Theme toggle
    document.querySelectorAll('[data-theme-toggle]').forEach(btn =>
      btn.addEventListener('click', toggleTheme)
    );
    // Hamburger / drawer
    const hamburger = document.querySelector('[data-hamburger]');
    const menu = document.querySelector('#mobileMenu');
    const backdrop = document.querySelector('#mobileBackdrop');
    const closeBtn = document.querySelector('[data-menu-close]');

    function openMenu() {
      if (!menu) return;
      menu.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      if (!menu) return;
      menu.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    if (hamburger) hamburger.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);

    // Close drawer when a nav link is clicked
    if (menu) menu.addEventListener('click', (e) => {
      if (e.target.closest('a') && !e.target.closest('[data-act="logout"]')) closeMenu();
    });

    // Escape key closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu && menu.classList.contains('open')) closeMenu();
    });

    // Logout
    document.querySelectorAll('[data-act="logout"]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        showModal({
          title: 'Logout',
          message: 'Are you sure you want to log out of your account?',
          confirmText: 'Logout',
          danger: true,
          onConfirm: () => {
            logoutUser();
            showToast('Logged out successfully', 'info');
            setTimeout(() => (window.location.href = 'index.html'), 600);
          },
        });
      })
    );
  }

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('empty', count === 0);
    });
  }

  /* ---------- DOM ready ---------- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function initScrollAnimations() {
    document.documentElement.classList.add('scroll-animations-ready');
    const revealTargets = document.querySelectorAll('main > section, main > .container > section, .book-card, .cat-card, .feature-card, .stat-card, .details-card, .contact-detail, .contact-form, .legal-content > section, footer .footer-col');
    revealTargets.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
    });
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px' });
    revealTargets.forEach((element) => observer.observe(element));
  }

  // Auto-mount header/footer on every page that includes app.js
  ready(() => {
    mountChrome();
    initScrollAnimations();
  });

  /* ---------- Expose ---------- */
  global.BV = {
    KEYS, read, write, remove, escapeHtml,
    getUsers, getCurrentUser, setCurrentUser,
    registerUser, loginUser, logoutUser, updateProfile, changePassword, requestPasswordReset, resetPassword,
    getTheme, applyTheme, toggleTheme, initTheme,
    showToast, showModal,
    searchBooks, getWorkDetails, getEditionDetails,
    getCoverUrl, getCoverByIsbn, normalizeBook, generatePrice, formatPrice, generateRating, starsHtml,
    getLibrary, saveLibrary, isBookInLibrary, addToLibrary, removeFromLibrary,
    getCart, saveCart, getCartCount, addToCart, removeFromCart, updateCartQuantity, clearCart, calculateCartTotal,
    getOrders, saveOrder, generateOrderId,
    getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory,
    requireAuth, mountChrome, updateCartBadge, ready,
  };
})(window);
