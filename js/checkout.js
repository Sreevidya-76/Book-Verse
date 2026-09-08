
(function () {
  'use strict';

  function init() {
    const page = document.getElementById('checkoutPage');
    if (!page) return;
    if (!BV.requireAuth()) return;

    const form = document.getElementById('checkoutForm');
    const summaryEl = document.getElementById('orderSummary');
    const successEl = document.getElementById('orderSuccess');

    const cart = BV.getCart();
    if (cart.length === 0) {
      document.getElementById('checkoutContent').innerHTML = `<div class="empty-state"><div class="emoji">🛒</div><h3>Your cart is empty</h3><p>Add some books to your cart before checking out.</p><a class="btn" href="books.html">Browse Books</a></div>`;
      return;
    }

    const user = BV.getCurrentUser();
    const nameEl = form.name;
    const emailEl = form.email;
    if (user) {
      nameEl.value = user.name || '';
      emailEl.value = user.email || '';
    }

    renderSummary();

    // Payment selection
    document.querySelectorAll('.pay-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const totals = BV.calculateCartTotal();
      const orderId = BV.generateOrderId();
      const order = {
        id: orderId,
        date: new Date().toISOString(),
        items: cart.map(i => ({ key: i.key, title: i.title, author: i.author, price: i.price, quantity: i.quantity, coverUrl: i.coverUrl })),
        totals,
        customer: {
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
        },
        address: {
          house: form.house.value.trim(),
          street: form.street.value.trim(),
          city: form.city.value.trim(),
          state: form.state.value.trim(),
          pincode: form.pincode.value.trim(),
        },
        payment: document.querySelector('input[name="payment"]:checked').value,
        status: 'Confirmed',
      };

      BV.saveOrder(order);
      BV.clearCart();
      BV.updateCartBadge();

      showSuccess(orderId);
    });

    function renderSummary() {
      const totals = BV.calculateCartTotal();
      const itemsHtml = cart.map(i => `
        <div class="osm-item">
          ${i.coverUrl ? `<img class="osm-cover" src="${BV.escapeHtml(i.coverUrl)}" alt="">` : `<div class="osm-cover"></div>`}
          <div class="osm-title">${BV.escapeHtml(i.title)}<div class="osm-qty">Qty ${i.quantity}</div></div>
          <div class="osm-price">${BV.formatPrice(i.price * i.quantity)}</div>
        </div>`).join('');

      summaryEl.innerHTML = `
        <div class="order-summary-mini">
          <h3>Order Summary</h3>
          ${itemsHtml}
          <div style="margin-top:14px">
            <div class="summary-row"><span>Subtotal</span><span class="val">${BV.formatPrice(totals.subtotal)}</span></div>
            <div class="summary-row discount"><span>Discount</span><span class="val">- ${BV.formatPrice(totals.discount)}</span></div>
            <div class="summary-row"><span>Delivery</span><span class="val">${totals.delivery === 0 ? 'FREE' : BV.formatPrice(totals.delivery)}</span></div>
            <div class="summary-row total"><span>Total</span><span class="val">${BV.formatPrice(totals.total)}</span></div>
          </div>
        </div>`;
    }

    function showSuccess(orderId) {
      document.getElementById('checkoutContent').classList.add('hidden');
      successEl.classList.remove('hidden');
      successEl.querySelector('#successOrderId').textContent = orderId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function validateForm(form) {
    let ok = true;
    const setError = (field, msg) => {
      const wrap = field.closest('.field');
      wrap.classList.toggle('invalid', !!msg);
      const err = wrap.querySelector('.error-msg');
      if (err) err.textContent = msg || '';
      if (msg) ok = false;
    };

    const fields = [
      { el: form.name, check: v => v.trim().length < 2 ? 'Enter your full name' : '' },
      { el: form.email, check: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email' },
      { el: form.phone, check: v => /^[0-9]{10}$/.test(v.trim().replace(/\s/g, '')) ? '' : 'Enter a 10-digit phone number' },
      { el: form.house, check: v => v.trim() ? '' : 'Required' },
      { el: form.street, check: v => v.trim() ? '' : 'Required' },
      { el: form.city, check: v => v.trim() ? '' : 'Required' },
      { el: form.state, check: v => v.trim() ? '' : 'Required' },
      { el: form.pincode, check: v => /^[0-9]{6}$/.test(v.trim()) ? '' : 'Enter a 6-digit pincode' },
    ];

    fields.forEach(f => setError(f.el, f.check(f.el.value)));

    if (!document.querySelector('input[name="payment"]:checked')) {
      BV.showToast('Please select a payment method', 'error');
      ok = false;
    }
    return ok;
  }

  BV.ready(init);
})();
