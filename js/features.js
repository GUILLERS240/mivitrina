/* Mi Vitrina — wishlist, settings, checkout, home config */
const SiteConfig = {
  home: {
    hero_title: 'Todo lo que necesitas, en un solo lugar',
    hero_subtitle: 'Descubre productos con la mejor calidad y los mejores precios.',
    hero_cta: 'Ver ofertas',
    featured_title: 'Productos destacados',
  },
  checkout: {
    shipping_standard_label: 'Envío estándar',
    shipping_standard_days: '3-5 días hábiles',
    shipping_standard_price: 0,
    shipping_express_label: 'Envío express',
    shipping_express_days: '1-2 días hábiles',
    shipping_express_price: 0,
    payment_methods: ['transferencia', 'efectivo'],
  },
  async load() {
    if (!window.sb) return this;
    try {
      const { data } = await sb.from('site_settings').select('key,value');
      (data || []).forEach((row) => {
        if (row.key === 'home' && row.value) this.home = { ...this.home, ...row.value };
        if (row.key === 'checkout' && row.value) this.checkout = { ...this.checkout, ...row.value };
      });
    } catch (e) {
      console.warn('SiteConfig', e);
    }
    this.applyHome();
    return this;
  },
  applyHome() {
    const t = document.querySelector('.hero-content h2');
    const s = document.querySelector('.hero-content p');
    const c = document.getElementById('btnHeroOffers');
    const f = document.querySelector('#view-inicio .section-header-row h1, #view-inicio .section-header h1');
    if (t) t.textContent = this.home.hero_title;
    if (s) s.textContent = this.home.hero_subtitle;
    if (c) c.textContent = this.home.hero_cta;
    if (f) f.textContent = this.home.featured_title;
  },
  async save(key, value) {
    if (!window.sb) throw new Error('Sin Supabase');
    const { error } = await sb.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    if (key === 'home') this.home = { ...this.home, ...value };
    if (key === 'checkout') this.checkout = { ...this.checkout, ...value };
  },
};

const Wishlist = {
  key: 'mp_wishlist',
  get() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (_) { return []; }
  },
  set(ids) { localStorage.setItem(this.key, JSON.stringify(ids)); },
  has(id) { return this.get().includes(id); },
  toggle(id) {
    const list = this.get();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    this.set(list);
    return list.includes(id);
  },
};

window.SiteConfig = SiteConfig;
window.Wishlist = Wishlist;

function openWishlist() {
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) { openAuthModal('login'); return; }
  const panel = document.getElementById('wishlistPanel');
  const body = document.getElementById('wishlistItems');
  if (!panel || !body) return;
  const ids = Wishlist.get();
  const products = (window.State?.products || []).filter((p) => ids.includes(p.id));
  if (!products.length && ids.length) {
    body.innerHTML = '<p style="text-align:center;padding:24px;color:var(--text-muted)">Cargando lista de deseos...</p>';
    panel.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
    (async () => {
      try {
        const all = await DataService.getProducts({});
        renderWishlistItems((all || []).filter((p) => ids.includes(p.id)));
      } catch (_) {
        body.innerHTML = '<p style="text-align:center;padding:24px">No se pudieron cargar los productos</p>';
      }
    })();
    return;
  }
  renderWishlistItems(products);
  panel.classList.remove('hidden');
  document.getElementById('overlay')?.classList.remove('hidden');
}

function renderWishlistItems(products) {
  const body = document.getElementById('wishlistItems');
  if (!body) return;
  if (!products.length) {
    body.innerHTML = `<div class="empty-state-block"><i class="fas fa-heart"></i><p><strong>Lista de deseos vacía</strong></p><p>Guarda productos con el corazón</p></div>`;
    return;
  }
  body.innerHTML = products.map((p) => `
    <div class="wish-item" data-id="${p.id}">
      <img src="${p.image || 'https://via.placeholder.com/80'}" alt="">
      <div class="wish-info">
        <div class="wish-name">${p.name}</div>
        <div class="wish-price">${typeof formatPrice === 'function' ? formatPrice(p.price) : p.price}</div>
        <button type="button" class="btn btn-sm btn-primary" data-wish-cart="${p.id}">Agregar al carrito</button>
      </div>
      <button type="button" class="icon-btn" data-wish-remove="${p.id}" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
    </div>`).join('');
  body.querySelectorAll('[data-wish-cart]').forEach((b) =>
    b.addEventListener('click', () => { if (typeof addToCart === 'function') addToCart(b.dataset.wishCart); })
  );
  body.querySelectorAll('[data-wish-remove]').forEach((b) =>
    b.addEventListener('click', () => { Wishlist.toggle(b.dataset.wishRemove); openWishlist(); })
  );
}

function openCheckout() {
  if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) { openAuthModal('login'); return; }
  if (!State.cart?.length) { toast('El carrito está vacío'); return; }
  const user = Auth.getUser();
  const cfg = SiteConfig.checkout;
  const panel = document.getElementById('checkoutPanel');
  const body = document.getElementById('checkoutBody');
  if (!panel || !body) return;
  const sub = State.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  body.innerHTML = `
    <div class="checkout-steps">
      <span class="step active">1 Envío</span>
      <span class="step">2 Pago</span>
      <span class="step">3 Confirmación</span>
    </div>
    <h3>Dirección de envío</h3>
    <div class="checkout-card">
      <p><strong>${user.name || 'Cliente'}</strong></p>
      <p>${user.address || '<span style="color:var(--danger)">Sin dirección — complétala en Mi Perfil</span>'}</p>
      <p>${user.phone || ''}</p>
      <button type="button" class="btn btn-outline btn-sm" id="chkEditAddr">Editar en perfil</button>
    </div>
    <h3>Método de envío</h3>
    <label class="pay-option"><input type="radio" name="shipMethod" value="standard" checked>
      <span><strong>${cfg.shipping_standard_label}</strong><br><small>${cfg.shipping_standard_days} · ${cfg.shipping_standard_price ? formatPrice(cfg.shipping_standard_price) : 'Gratis'}</small></span>
    </label>
    <label class="pay-option"><input type="radio" name="shipMethod" value="express">
      <span><strong>${cfg.shipping_express_label}</strong><br><small>${cfg.shipping_express_days} · ${cfg.shipping_express_price ? formatPrice(cfg.shipping_express_price) : 'Gratis'}</small></span>
    </label>
    <h3>Método de pago</h3>
    ${(cfg.payment_methods || ['transferencia']).map((m, i) => {
      const labels = { transferencia: 'Transferencia / Enzona / Transfermóvil', efectivo: 'Efectivo contra entrega', tarjeta: 'Tarjeta' };
      return `<label class="pay-option"><input type="radio" name="payMethod" value="${m}" ${i === 0 ? 'checked' : ''}>
        <span><strong>${labels[m] || m}</strong></span></label>`;
    }).join('')}
    <div class="checkout-total">
      <div><span>Subtotal</span><strong>${formatPrice(sub)}</strong></div>
      <div><span>Envío</span><strong id="chkShipCost">Gratis</strong></div>
      <div class="total-row"><span>Total</span><strong id="chkTotal">${formatPrice(sub)}</strong></div>
    </div>
    <button type="button" class="btn btn-primary btn-block" id="btnConfirmOrder">Confirmar pedido</button>`;
  panel.classList.remove('hidden');
  document.getElementById('overlay')?.classList.remove('hidden');
  document.getElementById('cartPanel')?.classList.add('hidden');
  const updateShip = () => {
    const v = body.querySelector('input[name="shipMethod"]:checked')?.value;
    const cost = v === 'express' ? Number(cfg.shipping_express_price || 0) : Number(cfg.shipping_standard_price || 0);
    document.getElementById('chkShipCost').textContent = cost ? formatPrice(cost) : 'Gratis';
    document.getElementById('chkTotal').textContent = formatPrice(sub + cost);
  };
  body.querySelectorAll('input[name="shipMethod"]').forEach((r) => r.addEventListener('change', updateShip));
  document.getElementById('chkEditAddr')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    document.getElementById('overlay')?.classList.add('hidden');
    switchView('perfil');
  });
  document.getElementById('btnConfirmOrder')?.addEventListener('click', async () => {
    if (!user.address) { toast('Completa tu dirección en Mi Perfil', 'error'); return; }
    const ship = body.querySelector('input[name="shipMethod"]:checked')?.value || 'standard';
    const pay = body.querySelector('input[name="payMethod"]:checked')?.value || 'transferencia';
    const shipCost = ship === 'express' ? Number(cfg.shipping_express_price || 0) : Number(cfg.shipping_standard_price || 0);
    const total = sub + shipCost;
    const btn = document.getElementById('btnConfirmOrder');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
    try {
      await DataService.createOrder({
        user_id: user.id,
        total,
        shipping_address: user.address,
        payment_method: pay,
        shipping_method: ship,
        items: State.cart.map((i) => ({
          product_id: i.product_id, name: i.name, image: i.image,
          quantity: i.quantity, unit_price: i.price, price: i.price, store_id: i.store_id,
        })),
      });
      State.cart = [];
      saveCart();
      panel.classList.add('hidden');
      document.getElementById('overlay')?.classList.add('hidden');
      toast('¡Pedido realizado!', 'success');
      switchView('pedidos');
    } catch (e) {
      toast(e.message || 'Error al crear pedido', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
    }
  });
}

window.openWishlist = openWishlist;
window.openCheckout = openCheckout;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => SiteConfig.load(), 400);
});

const _obsOrders = new MutationObserver(() => {
  document.querySelectorAll('#ordersList .order-card').forEach((card) => {
    if (card.dataset.status) return;
    const badge = card.querySelector('.status-badge');
    if (!badge) return;
    const cls = [...badge.classList].find((c) => c.startsWith('status-') && c !== 'status-badge');
    if (cls) card.dataset.status = cls.replace('status-', '');
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('ordersList');
  if (list) _obsOrders.observe(list, { childList: true, subtree: true });
});
