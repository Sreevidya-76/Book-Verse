
(function () {
  'use strict';

  function init() {
    const page = document.getElementById('cartPage');
    if (!page) return;
    if (!BV.requireAuth('login.html')) return;

    const itemsEl = document.getElementById('cartItems');
    const summaryEl = document.getElementById('cartSummary');
    const actionsEl = document.getElementById('cartActions');

    function render() {
      const cart = BV.getCart();

      if (cart.length === 0) {
        itemsEl.innerHTML = `<div class="empty-state"><div class="emoji">🛒</div><h3>Your cart is empty</h3><p>Discover your next great read and add books to your cart.</p><a class="btn" href="books.html">Browse Books</a></div>`;
        summaryEl.innerHTML = '';
        actionsEl.innerHTML = '';
        return;
      }

      itemsEl.innerHTML = cart.map(itemHTML).join('');

      const totals = BV.calculateCartTotal();
      summaryEl.innerHTML = `
        <div class="summary-card">
          <h3>Order Summary</h3>
          <div class="summary-row"><span>Subtotal (${totals.count} items)</span><span class="val">${BV.formatPrice(totals.subtotal)}</span></div>
          <div class="summary-row discount"><span>Discount</span><span class="val">- ${BV.formatPrice(totals.discount)}</span></div>
          <div class="summary-row"><span>Delivery</span><span class="val">${totals.delivery === 0 ? 'FREE' : BV.formatPrice(totals.delivery)}</span></div>
          <div class="summary-row total"><span>Total</span><span class="val">${BV.formatPrice(totals.total)}</span></div>
          <div class="promo">
            <input type="text" placeholder="Promo code" id="promoCode" value="BOOKVERSE" readonly>
            <button class="btn btn-soft btn-sm" id="applyPromo">Applied</button>
          </div>
          <p class="summary-note">Use BOOKVERSE for ₹100 off on orders above ₹999.</p>
          <a href="checkout.html" class="btn btn-lg btn-block" style="margin-top:14px">Proceed to Checkout →</a>
          <a href="books.html" class="btn btn-ghost btn-block" style="margin-top:8px">Continue Shopping</a>
        </div>`;

      actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" id="clearCart">🗑 Clear Cart</button>`;
    }

    function itemHTML(item) {
      const cover = item.coverUrl
        ? `<img src="${BV.escapeHtml(item.coverUrl)}" alt="${BV.escapeHtml(item.title)}" loading="lazy">`
        : `<div class="ph">📖</div>`;
      return `
      <div class="cart-item" data-key="${BV.escapeHtml(item.key)}">
        <a href="book-details.html?key=${encodeURIComponent(item.key)}" class="ci-cover">${cover}</a>
        <div class="ci-info">
          <h4><a href="book-details.html?key=${encodeURIComponent(item.key)}" style="color:inherit">${BV.escapeHtml(item.title)}</a></h4>
          <div class="ci-author">${BV.escapeHtml(item.author)}</div>
          <div class="ci-price">Unit price: <strong>${BV.formatPrice(item.price)}</strong></div>
        </div>
        <div class="ci-controls">
          <div class="qty-control">
            <button data-act="dec" data-key="${BV.escapeHtml(item.key)}" aria-label="Decrease">−</button>
            <span>${item.quantity}</span>
            <button data-act="inc" data-key="${BV.escapeHtml(item.key)}" aria-label="Increase">+</button>
          </div>
          <div class="ci-subtotal">${BV.formatPrice(item.price * item.quantity)}</div>
          <button class="ci-remove" data-act="remove" data-key="${BV.escapeHtml(item.key)}">🗑 Remove</button>
        </div>
      </div>`;
    }

    itemsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const key = btn.dataset.key;
      const act = btn.dataset.act;
      const cart = BV.getCart();
      const item = cart.find(i => i.key === key);
      if (!item) return;

      if (act === 'inc') { BV.updateCartQuantity(key, item.quantity + 1); BV.updateCartBadge(); render(); }
      if (act === 'dec') {
        if (item.quantity <= 1) {
          BV.removeFromCart(key);
        } else {
          BV.updateCartQuantity(key, item.quantity - 1);
        }
        BV.updateCartBadge();
        render();
      }
      if (act === 'remove') {
        BV.showModal({
          title: 'Remove item',
          message: `Remove "${item.title}" from your cart?`,
          confirmText: 'Remove',
          danger: true,
          onConfirm: () => {
            BV.removeFromCart(key);
            BV.updateCartBadge();
            BV.showToast('Item removed from cart', 'info');
            render();
          },
        });
      }
    });

    actionsEl.addEventListener('click', (e) => {
      if (e.target.id === 'clearCart') {
        BV.showModal({
          title: 'Clear cart',
          message: 'This will remove all items from your cart. Continue?',
          confirmText: 'Clear all',
          danger: true,
          onConfirm: () => {
            BV.clearCart();
            BV.updateCartBadge();
            BV.showToast('Cart cleared', 'info');
            render();
          },
        });
      }
    });

    render();
  }

  BV.ready(init);
})();
