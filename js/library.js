
(function () {
  'use strict';

  let state = { query: '', sort: 'recent' };

  function init() {
    const page = document.getElementById('libraryPage');
    if (!page) return;
    if (!BV.requireAuth()) return;

    const searchInput = document.getElementById('librarySearch');
    const sortSel = document.getElementById('librarySort');
    const grid = document.getElementById('libraryGrid');
    const statsEl = document.getElementById('libraryStats');

    function render() {
      let lib = BV.getLibrary();
      // Search
      if (state.query) {
        const q = state.query.toLowerCase();
        lib = lib.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
      }
      // Sort
      if (state.sort === 'title') lib.sort((a, b) => a.title.localeCompare(b.title));
      else if (state.sort === 'author') lib.sort((a, b) => a.author.localeCompare(b.author));
      else if (state.sort === 'year') lib.sort((a, b) => (b.year || 0) - (a.year || 0));
      else lib.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

      const total = BV.getLibrary().length;
      statsEl.innerHTML = `
        <div class="stat"><strong>${total}</strong><span>Books in library</span></div>
        <div class="stat"><strong>${new Set(lib.map(b => b.author)).size}</strong><span>Unique authors</span></div>
        <div class="stat"><strong>₹${lib.reduce((s, b) => s + (b.price || 0), 0).toLocaleString('en-IN')}</strong><span>Total value</span></div>`;

      if (lib.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="emoji">📚</div><h3>Your library is waiting</h3><p>Your library is empty. Start discovering books and save your favourites here.</p><a class="btn" href="books.html">Discover Books</a></div>`;
        return;
      }
      grid.innerHTML = lib.map(bookCardHTML).join('');
    }

    function bookCardHTML(book) {
      const cover = book.coverUrl
        ? `<img src="${BV.escapeHtml(book.coverUrl)}" alt="Cover of ${BV.escapeHtml(book.title)}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
           <div class="cover-placeholder" style="display:none;"><div><div class="ph-ic">📖</div>${BV.escapeHtml(book.title)}</div></div>`
        : `<div class="cover-placeholder"><div><div class="ph-ic">📖</div>${BV.escapeHtml(book.title)}</div></div>`;
      return `
      <article class="book-card" data-key="${BV.escapeHtml(book.key)}">
        <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="book-cover">
          ${book.year ? `<span class="year-badge">${book.year}</span>` : ''}
          <span class="lib-badge">♥</span>
          ${cover}
        </a>
        <div class="book-body">
          <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="book-title">${BV.escapeHtml(book.title)}</a>
          <div class="book-author">${BV.escapeHtml(book.author)}</div>
          <div class="book-rating"><span class="stars">${BV.starsHtml(book.rating)}</span><span>${book.rating.toFixed(1)}</span></div>
          <div class="book-price">${BV.formatPrice(book.price)}<span class="demo-tag">Demo</span></div>
          <div class="book-actions">
            <button class="btn btn-danger btn-sm" data-act="remove" data-key="${BV.escapeHtml(book.key)}">🗑 Remove</button>
            <button class="btn btn-sm" data-act="cart" data-key="${BV.escapeHtml(book.key)}">🛒 Cart</button>
          </div>
          <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="btn btn-ghost btn-sm btn-block book-details-btn">View Details</a>
        </div>
      </article>`;
    }

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const key = btn.dataset.key;
      const lib = BV.getLibrary();
      const book = lib.find(b => b.key === key);
      if (!book) return;

      if (btn.dataset.act === 'remove') {
        BV.showModal({
          title: 'Remove book',
          message: `Remove "${book.title}" from your library?`,
          confirmText: 'Remove',
          danger: true,
          onConfirm: () => {
            BV.removeFromLibrary(key);
            BV.showToast('Book removed from library', 'info');
            render();
          },
        });
      }
      if (btn.dataset.act === 'cart') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in before adding books to your cart.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = 'login.html?next=library.html'),
          });
          return;
        }
        BV.addToCart(book, 1);
        BV.updateCartBadge();
        BV.showToast('Book added to cart', 'success');
      }
    });

    searchInput.addEventListener('input', () => { state.query = searchInput.value.trim(); render(); });
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; render(); });

    render();
  }

  BV.ready(init);
})();
