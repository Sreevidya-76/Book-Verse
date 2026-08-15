/* ============================================================
   Book Verse — Book Details Page
   ============================================================ */

(function () {
  'use strict';

  function init() {
    const page = document.getElementById('detailsPage');
    if (!page) return;

    const params = new URLSearchParams(window.location.search);
    const key = params.get('key');
    const container = document.getElementById('detailsContent');
    const breadcrumb = document.getElementById('breadcrumbTitle');

    if (!key) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">❓</div><h3>No book selected</h3><p>No book was selected. Browse the collection to pick one.</p><a class="btn" href="books.html">Browse Books</a></div>`;
      return;
    }

    container.innerHTML = `<div class="loading-details"><div class="spinner"></div><span>Loading book details...</span></div>`;

    loadDetails(key, container, breadcrumb);
  }

  async function loadDetails(key, container, breadcrumb) {
    try {
      const work = await BV.getWorkDetails(key);
      const title = work.title || 'Untitled';
      if (breadcrumb) breadcrumb.textContent = title;

      const authors = (work.authors || []).map(a => a.author?.key || a.key || '').filter(Boolean);
      let authorName = 'Unknown Author';
      if (authors.length) {
        try {
          const aRes = await fetch(`https://openlibrary.org${authors[0]}.json`);
          if (aRes.ok) { const aData = await aRes.json(); authorName = aData.name || authorName; }
        } catch (_) { /* ignore */ }
      }

      const description = work.description
        ? (typeof work.description === 'string' ? work.description : work.description.value || '')
        : 'No description available for this book.';
      const subjects = (work.subjects || []).slice(0, 10).map(s => typeof s === 'string' ? s : s.name);
      const coverId = work.covers && work.covers[0];
      const coverUrl = coverId ? BV.getCoverUrl(coverId) : null;

      // Build a book object for cart/library
      const book = {
        key: key,
        title: title,
        author: authorName,
        authors: [authorName],
        year: null,
        publisher: null,
        publishers: [],
        language: null,
        isbn: null,
        coverId: coverId || null,
        coverUrl: coverUrl,
        pages: null,
        subjects: subjects,
        edition_key: [],
        price: BV.generatePrice({ title, first_publish_year: null, cover_i: coverId }),
        rating: BV.generateRating({ title, cover_i: coverId }),
      };

      // Try to fetch edition details for extra metadata
      try {
        const editions = work.editions || null;
        if (editions && editions.docs && editions.docs.length) {
          const ed = editions.docs[0];
          book.year = book.year || ed.first_publish_year || (work.first_publish_date ? parseInt(work.first_publish_date, 10) : null);
        }
      } catch (_) { /* ignore */ }

      renderDetails(book, description, subjects, container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">📡</div><h3>Unable to load details</h3><p>We couldn't load this book's details. Please check your connection and try again.</p><a class="btn" href="books.html">Back to Books</a></div>`;
    }
  }

  function renderDetails(book, description, subjects, container) {
    const inLib = BV.isBookInLibrary(book.key);
    const cover = book.coverUrl
      ? `<img src="${BV.escapeHtml(book.coverUrl)}" alt="Cover of ${BV.escapeHtml(book.title)}" onload="this.style.opacity=1">`
      : `<div class="cover-placeholder"><div><div class="ph-ic">📖</div><span>${BV.escapeHtml(book.title)}</span></div></div>`;

    container.innerHTML = `
      <div class="breadcrumb"><a href="index.html">Home</a><span>/</span><a href="books.html">Books</a><span>/</span><span id="breadcrumbTitle">${BV.escapeHtml(book.title)}</span></div>
      <div class="details-grid">
        <div class="details-left">
          <div class="details-cover">
            ${cover}
          </div>
          <div class="details-price-box">
            <div class="price">${BV.formatPrice(book.price)}</div>
            <span class="demo-tag">Demo store price</span>
            <span class="save">In stock · Free delivery over ₹499</span>
          </div>
          <div class="details-actions">
            <div class="btn-row">
              <button class="btn" data-act="cart" data-key="${BV.escapeHtml(book.key)}">🛒 Add to Cart</button>
              <button class="btn btn-soft" data-act="library" data-key="${BV.escapeHtml(book.key)}">${inLib ? '♥ Saved' : '♡ Add to Library'}</button>
            </div>
            <button class="btn btn-ghost btn-block" data-act="buy" data-key="${BV.escapeHtml(book.key)}">⚡ Buy Now</button>
            <a class="btn btn-outline btn-block" href="books.html">← Back to Books</a>
          </div>
        </div>
        <div class="details-right">
          <h1>${BV.escapeHtml(book.title)}</h1>
          <div class="details-author">by <a href="books.html?q=${encodeURIComponent(book.author)}&type=author">${BV.escapeHtml(book.author)}</a></div>
          <div class="details-meta">
            <div class="rating-block">
              <span class="stars">${BV.starsHtml(book.rating)}</span>
              <span class="rating-num">${book.rating.toFixed(1)}</span>
            </div>
            ${book.year ? `<span class="meta-pill">📅 ${book.year}</span>` : ''}
            <span class="meta-pill">📚 ${subjects.length || 0} subjects</span>
          </div>
          <div class="info-grid">
            <div class="info-item"><span class="label">Author</span><span class="value">${BV.escapeHtml(book.author)}</span></div>
            <div class="info-item"><span class="label">First Published</span><span class="value">${book.year || 'N/A'}</span></div>
            <div class="info-item"><span class="label">Publisher</span><span class="value">${book.publisher || 'Various'}</span></div>
            <div class="info-item"><span class="label">Language</span><span class="value">${book.language || 'English'}</span></div>
            <div class="info-item"><span class="label">Pages</span><span class="value">${book.pages || 'N/A'}</span></div>
            <div class="info-item"><span class="label">Work Key</span><span class="value" style="font-size:0.78rem;word-break:break-all">${BV.escapeHtml(book.key)}</span></div>
          </div>
          <div class="details-section">
            <h3>Description</h3>
            <p>${BV.escapeHtml(description)}</p>
          </div>
          ${subjects.length ? `
          <div class="details-section">
            <h3>Subjects</h3>
            <div class="subject-tags">
              ${subjects.map(s => `<span class="chip">${BV.escapeHtml(s)}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>`;

    bindDetailActions(container, book);
  }

  function bindDetailActions(container, book) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;

      if (act === 'library') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in to save books to your personal library.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = `login.html?next=book-details.html?key=${encodeURIComponent(book.key)}`),
          });
          return;
        }
        if (BV.isBookInLibrary(book.key)) {
          BV.removeFromLibrary(book.key);
          BV.showToast('Book removed from library', 'info');
          btn.textContent = '♡ Add to Library';
        } else {
          BV.addToLibrary(book);
          BV.showToast('Book added to library', 'success');
          btn.textContent = '♥ Saved';
        }
      }

      if (act === 'cart') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in before adding books to your cart.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = `login.html?next=book-details.html?key=${encodeURIComponent(book.key)}`),
          });
          return;
        }
        BV.addToCart(book, 1);
        BV.updateCartBadge();
        BV.showToast('Book added to cart', 'success');
      }

      if (act === 'buy') {
        if (!BV.getCurrentUser()) {
          BV.showModal({
            title: 'Login required',
            message: 'Please log in to proceed to checkout.',
            confirmText: 'Login',
            onConfirm: () => (window.location.href = `login.html?next=cart.html`),
          });
          return;
        }
        BV.addToCart(book, 1);
        BV.updateCartBadge();
        window.location.href = 'checkout.html';
      }
    });
  }

  BV.ready(init);
})();
