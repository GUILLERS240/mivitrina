/**
 * Mi Vitrina v0.1.2 - Logica principal
 */
const State = {
  cart: JSON.parse(localStorage.getItem('mp_cart') || '[]'),
  currentView: 'inicio',
  products: [],
  stores: [],
  orders: [],
  conversations: [],
  notifications: [],
  activeConversation: null,
};

function formatPrice(n) {
  return CONFIG.CURRENCY_SYMBOL + Number(n).toLocaleString('es-CO');
}

function toast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function saveCart() {
  localStorage.setItem('mp_cart', JSON.stringify(State.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = State.cart.reduce((s, i) => s + i.quantity, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.dataset.count = total;
}

function updateNotifBadge() {
  const unread = State.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  badge.textContent = unread;
  badge.dataset.count = unread;
}

function updateMsgBadge() {
  const unread = State.conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const badge = document.getElementById('msgBadge');
  badge.textContent = unread;
  badge.dataset.count = unread;
}

function switchView(viewName) {
  if ((viewName === 'perfil' || viewName === 'pedidos') && typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  State.currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
  if (viewName === 'inicio') renderProducts();
  if (viewName === 'tiendas') renderStores();
  if (viewName === 'pedidos') renderOrders();
  if (viewName === 'perfil') renderProfile();
  closeAllPanels();
}

function productSkeletonHTML(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton sk-img"></div>
      <div class="sk-body">
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line short"></div>
        <div class="skeleton sk-line price"></div>
      </div>
      <div class="skeleton sk-btn"></div>
    </div>
  `).join('');
}

function storeSkeletonHTML(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-store">
      <div class="skeleton sk-banner"></div>
      <div class="sk-body">
        <div class="skeleton sk-line" style="width:70%;height:14px"></div>
        <div class="skeleton sk-line short"></div>
        <div class="skeleton sk-line" style="width:45%"></div>
      </div>
    </div>
  `).join('');
}

function orderSkeletonHTML(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-order">
      <div class="skeleton sk-line w30"></div>
      <div class="skeleton sk-line w80"></div>
      <div class="skeleton sk-line w60"></div>
      <div class="skeleton sk-line w30" style="height:28px;margin-top:8px;border-radius:8px"></div>
    </div>
  `).join('');
}

function bindProductCardEvents(grid) {
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]')) return;
      openProductModal(card.dataset.id);
    });
  });
  grid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.add);
    });
  });
}

function productCardHTML(p, storeName) {
  const discount = p.old_price && p.old_price > p.price
    ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const img = p.image || 'https://via.placeholder.com/400?text=Producto';
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="img-wrap">
        ${discount > 0 ? `<span class="badge-discount">-${discount}%</span>` : ''}
        <img src="${img}" alt="${p.name}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/400?text=Producto'">
      </div>
      <div class="info">
        <div class="title">${p.name}</div>
        <div class="store-name"><i class="fas fa-store"></i> ${storeName}</div>
        <div class="price">
          ${formatPrice(p.price)}
          ${p.old_price ? `<small>${formatPrice(p.old_price)}</small>` : ''}
        </div>
      </div>
      <button class="add-btn" data-add="${p.id}">
        <i class="fas fa-cart-plus"></i> Agregar
      </button>
    </div>
  `;
}

async function renderProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = productSkeletonHTML(8);
  const category = document.getElementById('categoryFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value || '';
  const minDelay = new Promise(r => setTimeout(r, 400));
  try {
    const [products] = await Promise.all([
      DataService.getProducts({ category, sort, search }),
      minDelay,
    ]);
    State.products = products || [];
  } catch (e) {
    console.error(e);
    State.products = [];
  }
  if (State.products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-block">
        <i class="fas fa-box-open"></i>
        <p><strong>Aún no hay productos</strong></p>
        <p>Cuando los vendedores publiquen, aparecerán aquí.</p>
      </div>`;
    return;
  }
  if (!State.stores.length) {
    try { State.stores = await DataService.getStores(); } catch (_) {}
  }
  grid.innerHTML = State.products.map(p => {
    const store = (State.stores || []).find(s => s.id === p.store_id)
      || (p.stores ? { name: p.stores.name } : null)
      || { name: 'Tienda' };
    return productCardHTML(p, store.name);
  }).join('');
  bindProductCardEvents(grid);
}

async function renderStores() {
  const grid = document.getElementById('storesGrid');
  grid.innerHTML = storeSkeletonHTML(4);
  const minDelay = new Promise(r => setTimeout(r, 400));
  try {
    const [stores] = await Promise.all([DataService.getStores(), minDelay]);
    State.stores = stores || [];
  } catch (e) {
    State.stores = [];
  }
  if (State.stores.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-block" style="grid-column:1/-1">
        <i class="fas fa-store"></i>
        <p><strong>Aún no hay tiendas</strong></p>
        <p>Los vendedores aprobados aparecerán aquí.</p>
      </div>`;
    return;
  }
  grid.innerHTML = State.stores.map(s => `
    <div class="store-card" data-id="${s.id}">
      <div class="banner"></div>
      <img class="logo-img" src="${s.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name || 'T') + '&background=146eb4&color=fff'}" alt="${s.name}">
      <div class="info">
        <h3>${s.name}</h3>
        <p>${s.description || ''}</p>
        <div class="meta">
          <span><i class="fas fa-star"></i> ${s.rating ?? '—'}</span>
          <span><i class="fas fa-box"></i> ${s.products_count ?? '—'} productos</span>
        </div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => {
      document.getElementById('categoryFilter').value = '';
      document.getElementById('searchInput').value = '';
      switchView('inicio');
      setTimeout(async () => {
        const gridP = document.getElementById('productsGrid');
        gridP.innerHTML = productSkeletonHTML(6);
        State.products = await DataService.getProducts({ store_id: card.dataset.id });
        const store = State.stores.find(s => s.id === card.dataset.id);
        document.querySelector('#view-inicio .section-header h1').textContent =
          `Productos de ${store?.name || 'Tienda'}`;
        renderProductsFromState();
      }, 50);
    });
  });
}

function renderProductsFromState() {
  const grid = document.getElementById('productsGrid');
  if (State.products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-block">
        <i class="fas fa-box-open"></i>
        <p><strong>Esta tienda aún no tiene productos</strong></p>
      </div>`;
    return;
  }
  grid.innerHTML = State.products.map(p => {
    const store = (State.stores || []).find(s => s.id === p.store_id) || { name: 'Tienda' };
    return productCardHTML(p, store.name);
  }).join('');
  bindProductCardEvents(grid);
}

async function renderOrders() {
  const list = document.getElementById('ordersList');
  const empty = document.getElementById('ordersEmpty');
  if (!Auth.isLoggedIn()) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Inicia sesión para ver tus pedidos';
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = orderSkeletonHTML(3);
  const minDelay = new Promise(r => setTimeout(r, 350));
  try {
    const [orders] = await Promise.all([
      DataService.getOrders(Auth.getUser().id),
      minDelay,
    ]);
    State.orders = orders || [];
  } catch (e) {
    State.orders = JSON.parse(localStorage.getItem('mp_orders') || '[]');
  }
  if (State.orders.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Aún no tienes pedidos';
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = State.orders.map(order => {
    const statusClass = `status-${order.status}`;
    const statusLabel = {
      pendiente: 'Pendiente', aceptado: 'Aceptado', enviado: 'Enviado',
      entregado: 'Entregado', cancelado: 'Cancelado',
    }[order.status] || order.status;
    const itemsHtml = (order.items || []).map(item => `
      <div class="order-item">
        <img src="${item.image || 'https://via.placeholder.com/48'}" alt="">
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">Cant: ${item.quantity} × ${formatPrice(item.unit_price || item.price)}</div>
        </div>
      </div>
    `).join('');
    return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">Pedido #${String(order.id).slice(-8).toUpperCase()}</div>
            <div class="order-date">${new Date(order.created_at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</div>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-footer">
          <div class="order-total">Total: ${formatPrice(order.total)}</div>
          <div class="order-actions">
            <button class="btn btn-sm btn-secondary" data-msg-store="${order.items?.[0]?.store_id || ''}">
              <i class="fas fa-comments"></i> Escribir al vendedor
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  list.querySelectorAll('[data-msg-store]').forEach(btn => {
    btn.addEventListener('click', () => openMessages());
  });
}

function renderProfile() {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  const user = Auth.getUser();
  document.getElementById('profName').value = user.name || '';
  document.getElementById('profEmail').value = user.email || '';
  document.getElementById('profPhone').value = user.phone || '';
  document.getElementById('profAge').value = user.age || '';
  document.getElementById('profAddress').value = user.address || '';
  document.getElementById('profNotes').value = user.notes || '';
  document.getElementById('profileAvatar').src = user.avatar;
  document.getElementById('userAvatar').src = user.avatar;
  updateSellerRequestUI();
}

async function updateSellerRequestUI() {
  const container = document.getElementById('sellerRequestStatus');
  if (Auth.isSeller()) {
    container.innerHTML = `<p style="color:var(--success);font-weight:600"><i class="fas fa-check-circle"></i> Ya eres vendedor</p>
      <a href="seller.html" class="btn btn-secondary" style="margin-top:8px;display:inline-flex">Ir al Panel Vendedor</a>`;
    return;
  }
  const req = await DataService.getSellerRequest(Auth.getUser().id);
  if (req) {
    if (req.status === 'pendiente') {
      container.innerHTML = `<p style="color:var(--warning)"><i class="fas fa-clock"></i> Solicitud pendiente de revisión</p>`;
    } else if (req.status === 'aprobado') {
      container.innerHTML = `<p style="color:var(--success)"><i class="fas fa-check"></i> ¡Aprobado! Recarga para ver el panel.</p>`;
    } else {
      container.innerHTML = `<p style="color:var(--danger)">Solicitud rechazada. Puedes volver a intentar.</p>
        <button class="btn btn-secondary" id="btnRequestSeller" style="margin-top:8px">Solicitar de nuevo</button>`;
      document.getElementById('btnRequestSeller')?.addEventListener('click', requestSeller);
    }
  } else {
    container.innerHTML = `<button class="btn btn-secondary" id="btnRequestSeller">Solicitar ser vendedor</button>`;
    document.getElementById('btnRequestSeller')?.addEventListener('click', requestSeller);
  }
}

async function requestSeller() {
  if (!Auth.isLoggedIn()) return;
  try {
    await DataService.requestSeller(Auth.getUser().id, {
      store_name: Auth.getUser().name + ' Store',
      description: 'Solicitud desde la app',
    });
    toast('Solicitud enviada. Un admin la revisará pronto.', 'success');
    updateSellerRequestUI();
  } catch (e) {
    toast(e.message || 'Error al enviar solicitud', 'error');
  }
}

function addToCart(productId, qty = 1) {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    toast('Inicia sesión para agregar productos');
    return;
  }
  const product = State.products.find(p => p.id === productId) || (MOCK_PRODUCTS || []).find(p => p.id === productId);
  if (!product) return;
  const existing = State.cart.find(i => i.product_id === productId);
  if (existing) existing.quantity += qty;
  else {
    State.cart.push({
      product_id: productId, name: product.name, price: product.price,
      image: product.image, store_id: product.store_id, quantity: qty,
    });
  }
  saveCart();
  toast(`${product.name} agregado al carrito`, 'success');
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (State.cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">Tu carrito está vacío</p>';
    document.getElementById('cartTotal').textContent = formatPrice(0);
    return;
  }
  container.innerHTML = State.cart.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="price">${formatPrice(item.price)}</div>
        <div class="qty">
          <button data-qty-minus="${idx}">−</button>
          <span>${item.quantity}</span>
          <button data-qty-plus="${idx}">+</button>
          <button data-remove="${idx}" style="margin-left:auto;color:var(--danger)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
  const total = State.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById('cartTotal').textContent = formatPrice(total);
  container.querySelectorAll('[data-qty-minus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.qtyMinus;
      if (State.cart[i].quantity > 1) State.cart[i].quantity--;
      else State.cart.splice(i, 1);
      saveCart(); renderCart();
    });
  });
  container.querySelectorAll('[data-qty-plus]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.cart[+btn.dataset.qtyPlus].quantity++;
      saveCart(); renderCart();
    });
  });
  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.cart.splice(+btn.dataset.remove, 1);
      saveCart(); renderCart();
    });
  });
}

async function checkout() {
  if (!Auth.isLoggedIn()) { openAuthModal('login'); return; }
  if (State.cart.length === 0) { toast('El carrito está vacío'); return; }
  const user = Auth.getUser();
  if (!user.address) {
    toast('Completa tu dirección de entrega en Mi Perfil', 'error');
    switchView('perfil'); closeAllPanels(); return;
  }
  const total = State.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderData = {
    user_id: user.id, total, shipping_address: user.address,
    items: State.cart.map(i => ({
      product_id: i.product_id, name: i.name, image: i.image,
      quantity: i.quantity, unit_price: i.price, price: i.price, store_id: i.store_id,
    })),
  };
  try {
    await DataService.createOrder(orderData);
    State.cart = []; saveCart(); closeAllPanels();
    toast('¡Pedido realizado con éxito!', 'success');
    switchView('pedidos'); loadNotifications();
  } catch (e) {
    toast(e.message || 'Error al crear el pedido', 'error');
  }
}

function openProductModal(id) {
  const product = State.products.find(p => p.id === id) || (MOCK_PRODUCTS || []).find(p => p.id === id);
  if (!product) return;
  const store = (State.stores || []).find(s => s.id === product.store_id) || { name: 'Tienda' };
  const detail = document.getElementById('productDetail');
  detail.innerHTML = `
    <div class="product-detail-grid">
      <img class="product-detail-img" src="${product.image}" alt="${product.name}">
      <div class="product-detail-info">
        <h2>${product.name}</h2>
        <a class="store-link" href="#"><i class="fas fa-store"></i> ${store.name}</a>
        <div class="price">
          ${formatPrice(product.price)}
          ${product.old_price ? `<small style="text-decoration:line-through;color:var(--text-muted);font-size:1rem;margin-left:8px">${formatPrice(product.old_price)}</small>` : ''}
        </div>
        <p class="desc">${product.description || ''}</p>
        <div class="qty-selector">
          <button id="detailQtyMinus">−</button>
          <span id="detailQty">1</span>
          <button id="detailQtyPlus">+</button>
        </div>
        <button class="btn btn-primary btn-block" id="detailAddCart">
          <i class="fas fa-cart-plus"></i> Agregar al carrito
        </button>
      </div>
    </div>`;
  let qty = 1;
  document.getElementById('detailQtyMinus').onclick = () => {
    if (qty > 1) { qty--; document.getElementById('detailQty').textContent = qty; }
  };
  document.getElementById('detailQtyPlus').onclick = () => {
    qty++; document.getElementById('detailQty').textContent = qty;
  };
  document.getElementById('detailAddCart').onclick = () => {
    addToCart(product.id, qty); closeProductModal();
  };
  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

function openMessages() {
  if (!Auth.isLoggedIn()) { openAuthModal('login'); return; }
  State.conversations = JSON.parse(localStorage.getItem('mp_conversations') || 'null') || MOCK_CONVERSATIONS || [];
  renderConversations();
  document.getElementById('messagesPanel').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function renderConversations() {
  const list = document.getElementById('conversationsList');
  if (!State.conversations.length) {
    list.innerHTML = '<p style="padding:24px;text-align:center;color:var(--text-muted)">No tienes conversaciones aún</p>';
    return;
  }
  list.innerHTML = State.conversations.map(c => `
    <div class="conv-item" data-id="${c.id}">
      <img src="${c.avatar || 'https://ui-avatars.com/api/?name=U'}" alt="">
      <div class="conv-info">
        <div class="conv-name">${c.name}</div>
        <div class="conv-preview">${c.lastMessage || ''}</div>
      </div>
    </div>
  `).join('');
}

function openNotifications() {
  if (!Auth.isLoggedIn()) { openAuthModal('login'); return; }
  loadNotifications();
  document.getElementById('notifPanel').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

async function loadNotifications() {
  try {
    State.notifications = await DataService.getNotifications?.(Auth.getUser()?.id) || MOCK_NOTIFICATIONS || [];
  } catch {
    State.notifications = MOCK_NOTIFICATIONS || [];
  }
  updateNotifBadge();
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!State.notifications.length) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:24px">Sin notificaciones</p>';
    return;
  }
  list.innerHTML = State.notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-title">${n.title}</div>
      <div class="notif-body">${n.body}</div>
      <div class="notif-time">${n.time || ''}</div>
    </div>
  `).join('');
}

function openCart() {
  renderCart();
  document.getElementById('cartPanel').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function closeAllPanels() {
  ['cartPanel', 'messagesPanel', 'notifPanel'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  document.getElementById('overlay')?.classList.add('hidden');
  document.getElementById('authModal')?.classList.add('hidden');
  document.getElementById('productModal')?.classList.add('hidden');
}

function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.querySelectorAll('.auth-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function initUI() {
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      switchView(el.dataset.view);
    });
  });
  document.getElementById('btnLogin')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btnRegister')?.addEventListener('click', () => openAuthModal('register'));
  document.getElementById('btnLogout')?.addEventListener('click', e => { e.preventDefault(); Auth.logout(); });
  document.getElementById('btnCart')?.addEventListener('click', openCart);
  document.getElementById('btnMessages')?.addEventListener('click', openMessages);
  document.getElementById('btnNotifications')?.addEventListener('click', openNotifications);
  document.getElementById('closeCart')?.addEventListener('click', closeAllPanels);
  document.getElementById('closeMessages')?.addEventListener('click', closeAllPanels);
  document.getElementById('closeNotif')?.addEventListener('click', closeAllPanels);
  document.getElementById('closeAuth')?.addEventListener('click', closeAllPanels);
  document.getElementById('closeProduct')?.addEventListener('click', closeProductModal);
  document.getElementById('overlay')?.addEventListener('click', closeAllPanels);
  document.getElementById('btnCheckout')?.addEventListener('click', checkout);
  document.getElementById('categoryFilter')?.addEventListener('change', renderProducts);
  document.getElementById('sortFilter')?.addEventListener('change', renderProducts);
  document.getElementById('searchInput')?.addEventListener('input', debounce(renderProducts, 300));
  document.getElementById('avatarBtn')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.toggle('hidden');
  });
  document.getElementById('darkModeToggle')?.addEventListener('change', e => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : '');
    localStorage.setItem('mp_theme', e.target.checked ? 'dark' : 'light');
  });
  if (localStorage.getItem('mp_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const t = document.getElementById('darkModeToggle');
    if (t) t.checked = true;
  }
  document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.tab));
  });
  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await Auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
      closeAllPanels();
      toast('Sesión iniciada', 'success');
      updateAuthUI();
    } catch (err) {
      toast(err.message || 'Error al iniciar sesión', 'error');
    }
  });
  document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const p1 = document.getElementById('regPassword').value;
    const p2 = document.getElementById('regPassword2').value;
    if (p1 !== p2) { toast('Las contraseñas no coinciden', 'error'); return; }
    try {
      await Auth.register(document.getElementById('regName').value, document.getElementById('regEmail').value, p1);
      toast('Cuenta creada. Revisa tu correo.', 'success');
      openAuthModal('login');
    } catch (err) {
      toast(err.message || 'Error al registrarse', 'error');
    }
  });
  document.getElementById('profileForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await Auth.updateProfile({
        name: document.getElementById('profName').value,
        phone: document.getElementById('profPhone').value,
        age: document.getElementById('profAge').value,
        address: document.getElementById('profAddress').value,
        notes: document.getElementById('profNotes').value,
      });
      toast('Perfil actualizado', 'success');
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error');
    }
  });
  document.getElementById('goSellerPanel')?.addEventListener('click', e => {
    e.preventDefault(); window.location.href = 'seller.html';
  });
  document.getElementById('goAdminPanel')?.addEventListener('click', e => {
    e.preventDefault(); window.location.href = 'admin.html';
  });
}

function updateAuthUI() {
  const logged = Auth.isLoggedIn();
  document.getElementById('guestActions')?.classList.toggle('hidden', logged);
  document.getElementById('userActions')?.classList.toggle('hidden', !logged);
  if (logged) {
    const u = Auth.getUser();
    const av = document.getElementById('userAvatar');
    if (av) av.src = u.avatar;
    document.getElementById('goSellerPanel')?.classList.toggle('hidden', !Auth.isSeller());
    document.getElementById('goAdminPanel')?.classList.toggle('hidden', !Auth.isAdmin());
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  updateCartBadge();
  try { await Auth.init(); } catch (e) { console.warn(e); }
  updateAuthUI();
  Auth.onAuthChange?.(() => updateAuthUI());
  renderProducts();
  loadNotifications();
});
