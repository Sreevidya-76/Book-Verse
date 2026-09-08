
(function () {
  'use strict';

  const PAGE_SIZE = 20;

  /* ---------- Book card HTML ---------- */
  function bookCardHTML(book) {
    const inLib = BV.isBookInLibrary(book.key);
    const cover = book.coverUrl
      ? `<img src="${BV.escapeHtml(book.coverUrl)}" alt="Cover of ${BV.escapeHtml(book.title)}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
         <div class="cover-placeholder" style="display:none;"><div><div class="ph-ic">📖</div>${BV.escapeHtml(book.title)}</div></div>`
      : `<div class="cover-placeholder"><div><div class="ph-ic">📖</div>${BV.escapeHtml(book.title)}</div></div>`;

    return `
    <article class="book-card" data-key="${BV.escapeHtml(book.key)}">
      <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="book-cover" aria-label="View ${BV.escapeHtml(book.title)}">
        ${book.year ? `<span class="year-badge">${book.year}</span>` : ''}
        ${inLib ? `<span class="lib-badge" title="In your library">♥</span>` : ''}
        ${cover}
      </a>
      <div class="book-body">
        <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="book-title">${BV.escapeHtml(book.title)}</a>
        <div class="book-author">${BV.escapeHtml(book.author)}</div>
        <div class="book-card-meta">
          <div class="book-price">${BV.formatPrice(book.price)}<span class="demo-tag">Demo</span></div>
          <div class="book-rating">
            <span class="stars">${BV.starsHtml(book.rating)}</span>
            <span>${book.rating.toFixed(1)}</span>
          </div>
        </div>
        <div class="book-actions">
          <button class="btn btn-soft btn-sm" data-act="library" data-key="${BV.escapeHtml(book.key)}" title="Add to library">${inLib ? '♥ Saved' : '♡ Library'}</button>
          <button class="btn btn-sm" data-act="cart" data-key="${BV.escapeHtml(book.key)}">🛒 Cart</button>
        </div>
        <a href="book-details.html?key=${encodeURIComponent(book.key)}" class="btn btn-ghost btn-sm btn-block book-details-btn">View Details</a>
      </div>
    </article>`;
  }

  function skeletonGridHTML(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<div class="skeleton-card"><div class="sk-cover"></div><div class="sk-line"></div><div class="sk-line short"></div><div class="sk-line"></div></div>`;
    }
    return `<div class="skeleton-grid">${s}</div>`;
  }

  /* ---------- Card actions (event delegation) ---------- */
  function bindCardActions(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.preventDefault();
      const key = btn.dataset.key;
      const card = btn.closest('.book-card');
      const book = findBookInCache(key);
      if (!book) return;

      if (btn.dataset.act === 'library') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in to save books to your personal library.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = `login.html?next=books.html`),
          });
          return;
        }
        if (BV.isBookInLibrary(book.key)) {
          BV.removeFromLibrary(book.key);
          BV.showToast('Book removed from library', 'info');
          btn.textContent = '♡ Library';
          const badge = card.querySelector('.lib-badge');
          if (badge) badge.remove();
        } else {
          BV.addToLibrary(book);
          BV.showToast('Book added to library', 'success');
          btn.textContent = '♥ Saved';
          const cover = card.querySelector('.book-cover');
          if (cover && !cover.querySelector('.lib-badge')) {
            const b = document.createElement('span');
            b.className = 'lib-badge';
            b.textContent = '♥';
            cover.appendChild(b);
          }
        }
      }

      if (btn.dataset.act === 'cart') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in before adding books to your cart.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = `login.html?next=books.html`),
          });
          return;
        }
        BV.addToCart(book, 1);
        BV.updateCartBadge();
        BV.showToast('Book added to cart', 'success');
      }
    });
  }

  /* ---------- Book cache for card actions ---------- */
  const bookCache = new Map();
  function cacheBooks(list) {
    list.forEach(b => { if (b.key) bookCache.set(b.key, b); });
  }
  function findBookInCache(key) { return bookCache.get(key) || null; }

  /* ---------- Home: Popular + Recommended ---------- */
  async function loadHomeSections() {
    const popularEl = document.getElementById('popularBooks');
    const recommendedEl = document.getElementById('recommendedBooks');
    if (!popularEl && !recommendedEl) return;

    if (popularEl) popularEl.innerHTML = skeletonGridHTML(5);
    if (recommendedEl) recommendedEl.innerHTML = skeletonGridHTML(5);

    try {
      const [popRes, recRes] = await Promise.all([
        BV.searchBooks('fantasy', 1, 5),
        BV.searchBooks('self development', 1, 5),
      ]);
      const pop = popRes.docs.slice(0, 5).map(BV.normalizeBook);
      const rec = recRes.docs.slice(0, 5).map(BV.normalizeBook);
      cacheBooks(pop); cacheBooks(rec);

      if (popularEl) {
        popularEl.innerHTML = pop.map(bookCardHTML).join('');
        bindCardActions(popularEl);
      }
      if (recommendedEl) {
        recommendedEl.innerHTML = rec.map(bookCardHTML).join('');
        bindCardActions(recommendedEl);
      }
    } catch (err) {
      const msg = 'Unable to load books right now. Please check your internet connection and try again.';
      if (popularEl) popularEl.innerHTML = `<div class="empty-state"><div class="emoji">📡</div><h3>Connection issue</h3><p>${msg}</p></div>`;
      if (recommendedEl) recommendedEl.innerHTML = `<div class="empty-state"><div class="emoji">📡</div><h3>Connection issue</h3><p>${msg}</p></div>`;
    }
  }

  /* ---------- Live autocomplete ---------- */
  function initAutocomplete(input, onSelect) {
    if (!input) return;
    const wrapper = input.closest('.search-box, .hero-search') || input.parentElement;
    if (!wrapper) return;
    wrapper.classList.add('autocomplete-wrap');
    const list = document.createElement('div');
    list.className = 'autocomplete-list';
    list.setAttribute('role', 'listbox');
    wrapper.appendChild(list);
    let timer;

    function close() { list.innerHTML = ''; list.hidden = true; }
    async function update() {
      const term = input.value.trim();
      if (term.length < 1) { close(); return; }
      try {
        const data = await BV.searchBooks(term, 1, 6);
        const suggestions = data.docs.map(BV.normalizeBook).filter((book, i, all) => book.title && all.findIndex(item => item.title.toLowerCase() === book.title.toLowerCase()) === i).slice(0, 5);
        list.innerHTML = suggestions.map(book => `<button type="button" role="option" data-term="${BV.escapeHtml(book.title)}"><strong>${BV.escapeHtml(book.title)}</strong><span>${BV.escapeHtml(book.author)}</span></button>`).join('');
        if (!suggestions.length) {
          const fallback = localSuggestions.filter(item => item.toLowerCase().includes(term.toLowerCase()));
          list.innerHTML = fallback.map(item => `<button type="button" role="option" data-term="${BV.escapeHtml(item)}"><strong>${BV.escapeHtml(item)}</strong><span>Book Verse suggestion</span></button>`).join('');
          list.hidden = fallback.length === 0;
        } else {
          list.hidden = false;
        }
      } catch (_) {
        const suggestions = localSuggestions.filter(item => item.toLowerCase().includes(term.toLowerCase()));
        list.innerHTML = suggestions.map(item => `<button type="button" role="option" data-term="${BV.escapeHtml(item)}"><strong>${BV.escapeHtml(item)}</strong><span>Book Verse suggestion</span></button>`).join('');
        list.hidden = suggestions.length === 0;
      }
    }
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 120); });
    list.addEventListener('click', (event) => {
      const item = event.target.closest('[data-term]');
      if (!item) return;
      input.value = item.dataset.term;
      close();
      onSelect(item.dataset.term);
    });
    document.addEventListener('click', (event) => { if (!wrapper.contains(event.target)) close(); });
  }

  const localSuggestions = ['Atomic Habits', 'The Alchemist', 'Harry Potter', 'Pride and Prejudice', 'The Great Gatsby', 'Self Development'];

  /* ---------- Home hero search ---------- */
  function initHeroSearch() {
    const form = document.getElementById('heroSearch');
    if (!form) return;
    const input = form.querySelector('input');
    const submit = () => {
      const q = input.value.trim();
      window.location.href = q ? `books.html?q=${encodeURIComponent(q)}` : 'books.html';
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    initAutocomplete(input, (term) => { window.location.href = `books.html?q=${encodeURIComponent(term)}`; });
    const exploreBtn = document.getElementById('heroExplore');
    if (exploreBtn) exploreBtn.addEventListener('click', () => (window.location.href = 'books.html'));
  }

  /* ---------- Categories on home ---------- */
  function initCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    const cats = [
      { name: 'Fiction', emoji: '📕', q: 'fiction' },
      { name: 'Fantasy', emoji: '🐉', q: 'fantasy' },
      { name: 'Science', emoji: '🔬', q: 'science' },
      { name: 'Technology', emoji: '💻', q: 'technology' },
      { name: 'Programming', emoji: '⌨️', q: 'programming' },
      { name: 'Business', emoji: '💼', q: 'business' },
      { name: 'Self Development', emoji: '🌱', q: 'self help' },
      { name: 'History', emoji: '🏛️', q: 'history' },
      { name: 'Biography', emoji: '👤', q: 'biography' },
      { name: 'Romance', emoji: '❤️', q: 'romance' },
      { name: 'Mystery', emoji: '🔍', q: 'mystery' },
      { name: 'Children', emoji: '🧸', q: 'children' },
      { name: 'Education', emoji: '🎓', q: 'education' },
    ];
    grid.innerHTML = cats.map(c =>
      `<a class="cat-card" href="books.html?q=${encodeURIComponent(c.q)}&type=subject">
        <div><h4>${c.name}</h4><span>Explore books</span></div>
      </a>`
    ).join('');
  }

  /* ---------- Books page ---------- */
  let booksState = { query: '', page: 1, total: 0, type: 'all', sort: 'relevance', lang: 'all', year: '' };

  function initBooksPage() {
    const page = document.getElementById('booksPage');
    if (!page) return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const type = params.get('type') || 'all';

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const typeSel = document.getElementById('filterType');
    const sortSel = document.getElementById('filterSort');
    const langSel = document.getElementById('filterLang');
    const yearInput = document.getElementById('filterYear');
    const resultsEl = document.getElementById('booksResults');
    const countEl = document.getElementById('resultsCount');
    const paginationEl = document.getElementById('pagination');
    const recentEl = document.getElementById('recentSearches');

    if (q) searchInput.value = q;
    if (type && type !== 'all') typeSel.value = type;
    booksState.query = q;
    booksState.type = type;

    async function doSearch(pageNum = 1) {
      booksState.page = pageNum;
      const term = searchInput.value.trim() || '*';

      resultsEl.innerHTML = skeletonGridHTML(10);
      countEl.textContent = 'Loading...';
      paginationEl.innerHTML = '';

      try {
        let apiQuery = term;
        if (booksState.type === 'title') apiQuery = `title:${term}`;
        else if (booksState.type === 'author') apiQuery = `author:${term}`;
        else if (booksState.type === 'subject') apiQuery = `subject:${term}`;

        const data = await BV.searchBooks(apiQuery, booksState.page, PAGE_SIZE);
        let books = data.docs.map(BV.normalizeBook);

        // Language filter
        if (booksState.lang !== 'all') {
          books = books.filter(b => {
            const lang = (b.language || '').toString().toLowerCase();
            if (booksState.lang === 'other') return lang && !['eng', 'en', 'hin', 'hi', 'tel', 'te'].includes(lang);
            const map = { english: ['eng', 'en'], hindi: ['hin', 'hi'], telugu: ['tel', 'te'] };
            return map[booksState.lang].some(c => lang === c);
          });
        }

        // Year filter
        if (booksState.year) {
          const yr = parseInt(booksState.year, 10);
          books = books.filter(b => b.year && b.year >= yr);
        }

        // Sort
        if (booksState.sort === 'title-az') books.sort((a, b) => a.title.localeCompare(b.title));
        else if (booksState.sort === 'title-za') books.sort((a, b) => b.title.localeCompare(a.title));
        else if (booksState.sort === 'year') books.sort((a, b) => (a.year || 0) - (b.year || 0));
        else if (booksState.sort === 'newest') books.sort((a, b) => (b.year || 0) - (a.year || 0));

        cacheBooks(books);
        booksState.total = data.numFound || books.length;

        if (books.length === 0) {
          resultsEl.innerHTML = `<div class="empty-state"><div class="emoji">🔍</div><h3>No books found</h3><p>No books found. Try searching with another title or author.</p></div>`;
          countEl.textContent = '';
          return;
        }

        resultsEl.innerHTML = `<div class="books-grid">${books.map(bookCardHTML).join('')}</div>`;
        bindCardActions(resultsEl);
        countEl.innerHTML = `<span class="count">Showing <strong>${books.length}</strong> of <strong>${booksState.total.toLocaleString()}</strong> books</span>`;

        renderPagination(data.numFound || books.length);
        BV.addSearchHistory(term);
        renderRecent(recentEl);
      } catch (err) {
        resultsEl.innerHTML = `<div class="empty-state"><div class="emoji">📡</div><h3>Unable to load books</h3><p>Unable to load books right now. Please check your internet connection and try again.</p></div>`;
        countEl.textContent = '';
      }
    }

    function renderPagination(total) {
      const pages = Math.min(Math.ceil(total / PAGE_SIZE), 10);
      if (pages <= 1) { paginationEl.innerHTML = ''; return; }
      let html = '';
      html += `<button ${booksState.page === 1 ? 'disabled' : ''} data-page="${booksState.page - 1}">‹ Prev</button>`;
      for (let i = 1; i <= pages; i++) {
        html += `<button class="${i === booksState.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      html += `<button ${booksState.page === pages ? 'disabled' : ''} data-page="${booksState.page + 1}">Next ›</button>`;
      paginationEl.innerHTML = html;
    }

    function renderRecent(el) {
      if (!el) return;
      const hist = BV.getSearchHistory();
      if (hist.length === 0) { el.innerHTML = ''; return; }
      el.innerHTML = `<span class="recent-label">Recent:</span>` + hist.slice(0, 6).map(s =>
        `<span class="recent-chip" data-term="${BV.escapeHtml(s.term)}">${BV.escapeHtml(s.term)} <button class="rm" data-rm="${BV.escapeHtml(s.term)}" aria-label="Remove">×</button></span>`
      ).join('') + `<button class="chip btn-sm" data-clear="1">Clear all</button>`;
    }

    // Events
    searchBtn.addEventListener('click', () => doSearch(1));
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(1); });
    initAutocomplete(searchInput, (term) => { searchInput.value = term; doSearch(1); });
    typeSel.addEventListener('change', () => { booksState.type = typeSel.value; doSearch(1); });
    sortSel.addEventListener('change', () => { booksState.sort = sortSel.value; doSearch(1); });
    langSel.addEventListener('change', () => { booksState.lang = langSel.value; doSearch(1); });
    yearInput.addEventListener('change', () => { booksState.year = yearInput.value; doSearch(1); });

    paginationEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      doSearch(parseInt(btn.dataset.page, 10));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    recentEl.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-rm]');
      if (rm) { e.stopPropagation(); BV.removeSearchHistory(rm.dataset.rm); renderRecent(recentEl); return; }
      if (e.target.closest('[data-clear]')) { BV.clearSearchHistory(); renderRecent(recentEl); return; }
      const chip = e.target.closest('[data-term]');
      if (chip) { searchInput.value = chip.dataset.term; doSearch(1); }
    });

    renderRecent(recentEl);
    doSearch(1);
  }

  /* ---------- Init ---------- */
  BV.ready(() => {
    initHeroSearch();
    initCategories();
    initBooksPage();
    loadHomeSections();
  });
})();
