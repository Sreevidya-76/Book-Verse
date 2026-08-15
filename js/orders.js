/* ============================================================
   Book Verse — Orders Page
   ============================================================ */

(function () {
  'use strict';

  function init() {
    const page = document.getElementById('ordersPage');
    if (!page) return;
    if (!BV.requireAuth()) return;

    const listEl = document.getElementById('ordersList');

    function render() {
      const orders = BV.getOrders();
      if (orders.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><div class="emoji">📦</div><h3>No orders yet</h3><p>You haven't placed any orders yet. Start shopping to see your order history here.</p><a class="btn" href="books.html">Browse Books</a></div>`;
        return;
      }
      listEl.innerHTML = orders.map(orderHTML).join('');
    }

    function orderHTML(order) {
      const date = new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const itemsHtml = order.items.map(i =>
        `<a href="book-details.html?key=${encodeURIComponent(i.key)}" class="osm-item">
          ${i.coverUrl ? `<img class="osm-cover" src="${BV.escapeHtml(i.coverUrl)}" alt="">` : `<div class="osm-cover"></div>`}
          <div class="osm-title">${BV.escapeHtml(i.title)}<div class="osm-qty">Qty ${i.quantity}</div></div>
          <div class="osm-price">${BV.formatPrice(i.price * i.quantity)}</div>
        </a>`
      ).join('');

      return `
      <div class="checkout-section" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div>
            <h3 style="margin:0;font-size:1.1rem">Order #${BV.escapeHtml(order.id)}</h3>
            <span class="muted" style="font-size:0.85rem">${date}</span>
          </div>
          <span class="badge badge-success">${BV.escapeHtml(order.status)}</span>
        </div>
        <div style="margin:14px 0">${itemsHtml}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:14px;flex-wrap:wrap;gap:10px">
          <div class="muted" style="font-size:0.85rem">
            ${order.items.reduce((n, i) => n + i.quantity, 0)} books · ${BV.escapeHtml(order.payment.replace('-', ' '))}
          </div>
          <div style="font-size:1.2rem;font-weight:800">${BV.formatPrice(order.totals.total)}</div>
        </div>
      </div>`;
    }

    render();
  }

  BV.ready(init);
})();
