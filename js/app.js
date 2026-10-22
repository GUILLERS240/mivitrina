/**
 * MercadoPlus v0.1 - Lógica principal de la tienda
 */

// Estado global
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

// ===== UTILIDADES =====
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

// ===== NAVEGACIÓN =====
function switchView(viewName) {
  State.currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Cargar datos específicos
  if (viewName === 'inicio') renderProducts();
  if (viewName === 'tiendas') renderStores();
  if (viewName === 'pedidos') renderOrders();
  if (viewName === 'perfil') renderProfile();

  // Cerrar paneles
  closeAllPanels();
}

// ===== RENDER PRODUCTOS =====
async function renderProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Cargando productos...</p>';

  const category = document.getElementById('categoryFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || '';
  const search = document.getElementById('searchInput')?.value || '';

  try {
    State.products = await DataService.getProducts({ category, sort, search });
  } catch (e) {
    console.error(e);
    State.products = MOCK_PRODUCTS;
  }

  if (State.products.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No se encontraron productos</p>';
    return;
  }

  grid.innerHTML = State.products.map(p => {
    const store = MOCK_STORES.find(s => s.id === p.store_id) || { name: 'Tienda' };
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400?text=Producto'">
        </div>
        <div class="info">
          <div class="title">${p.name}</div>
          <div class="store-name">${store.name}</div>
          <div class="price">
            ${formatPrice(p.price)}
            ${p.old_price ? `<small>${formatPrice(p.old_price)}</small>` : ''}
          </div>
        </div>
        <button class="add-btn" data-add="${p.id}">Agregar al carrito</button>
      </div>
    `;
  }).join('');

  // Eventos
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

// ===== RENDER TIENDAS =====
async function renderStores() {
  const grid = document.getElementById('storesGrid');
  try {
    State.stores = await DataService.getStores();
  } catch (e) {
    State.stores = MOCK_STORES;
  }

  grid.innerHTML = State.stores.map(s => `
    <div class="store-card" data-id="${s.id}">
      <div class="banner"></div>
      <img class="logo-img" src="${s.logo}" alt="${s.name}">
      <div class="info">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        <div class="meta">
          <span><i class="fas fa-star"></i> ${s.rating}</span>
          <span><i class="fas fa-box"></i> ${s.products_count} productos</span>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => {
      // Filtrar productos por tienda
      document.getElementById('categoryFilter').value = '';
      document.getElementById('searchInput').value = '';
      switchView('inicio');
      // Filtrar después de cambiar vista
      setTimeout(async () => {
        State.products = await DataService.getProducts({ store_id: card.dataset.id });
        const gridP = document.getElementById('productsGrid');
        const store = State.stores.find(s => s.id === card.dataset.id);
        document.querySelector('#view-inicio .section-header h1').textContent = `Productos de ${store?.name || 'Tienda'}`;
        renderProductsFromState();
      }, 50);
    });
  });
}

function renderProductsFromState() {
  const grid = document.getElementById('productsGrid');
  if (State.products.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Esta tienda aún no tiene productos</p>';
    return;
  }
  grid.innerHTML = State.products.map(p => {
    const store = MOCK_STORES.find(s => s.id === p.store_id) || { name: 'Tienda' };
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="info">
          <div class="title">${p.name}</div>
          <div class="store-name">${store.name}</div>
          <div class="price">
            ${formatPrice(p.price)}
            ${p.old_price ? `<small>${formatPrice(p.old_price)}</small>` : ''}
          </div>
        </div>
        <button class="add-btn" data-add="${p.id}">Agregar al carrito</button>
      </div>
    `;
  }).join('');

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

// ===== RENDER PEDIDOS =====
async function renderOrders() {
  const list = document.getElementById('ordersList');
  const empty = document.getElementById('ordersEmpty');

  if (!Auth.isLoggedIn()) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Inicia sesión para ver tus pedidos';
    return;
  }

  try {
    State.orders = await DataService.getOrders(Auth.getUser().id);
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
      pendiente: 'Pendiente',
      aceptado: 'Aceptado',
      enviado: 'Enviado',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
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
            <div class="order-id">Pedido #${order.id.slice(-8).toUpperCase()}</div>
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
    btn.addEventListener('click', () => {
      openMessages();
      // En v0.1 simplemente abre mensajes
    });
  });
}

// ===== RENDER PERFIL =====
function renderProfile() {
  if (!Auth.isLoggedIn()) {
    switchView('inicio');
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

  // Seller request status
  updateSellerRequestUI();
}

async function updateSellerRequestUI() {
  const container = document.getElementById('sellerRequestStatus');
  if (Auth.isSeller()) {
    container.innerHTML = `
      <p style="color:var(--success);font-weight:600"><i class="fas fa-check-circle"></i> Ya eres vendedor</p>
      <a href="seller.html" class="btn btn-secondary" style="margin-top:8px;display:inline-flex">Ir al Panel Vendedor</a>
    `;
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

// ===== CARRITO =====
function addToCart(productId, qty = 1) {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    toast('Inicia sesión para agregar productos');
    return;
  }

  const product = State.products.find(p => p.id === productId) || MOCK_PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = State.cart.find(i => i.product_id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    State.cart.push({
      product_id: productId,
      name: product.name,
      price: product.price,
      image: product.image,
      store_id: product.store_id,
      quantity: qty,
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
      saveCart();
      renderCart();
    });
  });
  container.querySelectorAll('[data-qty-plus]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.cart[+btn.dataset.qtyPlus].quantity++;
      saveCart();
      renderCart();
    });
  });
  container.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.cart.splice(+btn.dataset.remove, 1);
      saveCart();
      renderCart();
    });
  });
}

async function checkout() {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  if (State.cart.length === 0) {
    toast('El carrito está vacío');
    return;
  }

  const user = Auth.getUser();
  if (!user.address) {
    toast('Completa tu dirección de entrega en Mi Perfil', 'error');
    switchView('perfil');
    closeAllPanels();
    return;
  }

  const total = State.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const orderData = {
    user_id: user.id,
    total,
    shipping_address: user.address,
    items: State.cart.map(i => ({
      product_id: i.product_id,
      name: i.name,
      image: i.image,
      quantity: i.quantity,
      unit_price: i.price,
      price: i.price,
      store_id: i.store_id,
    })),
  };

  try {
    await DataService.createOrder(orderData);
    State.cart = [];
    saveCart();
    closeAllPanels();
    toast('¡Pedido realizado con éxito!', 'success');
    switchView('pedidos');
    // Actualizar notificaciones
    loadNotifications();
  } catch (e) {
    toast(e.message || 'Error al crear el pedido', 'error');
  }
}

// ===== PRODUCT MODAL =====
function openProductModal(id) {
  const product = State.products.find(p => p.id === id) || MOCK_PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const store = MOCK_STORES.find(s => s.id === product.store_id) || { name: 'Tienda' };

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
        <p class="desc">${product.description}</p>
        <div class="qty-selector">
          <button id="detailQtyMinus">−</button>
          <span id="detailQty">1</span>
          <button id="detailQtyPlus">+</button>
        </div>
        <button class="btn btn-primary btn-block" id="detailAddCart">
          <i class="fas fa-cart-plus"></i> Agregar al carrito
        </button>
      </div>
    </div>
  `;

  let qty = 1;
  document.getElementById('detailQtyMinus').onclick = () => {
    if (qty > 1) { qty--; document.getElementById('detailQty').textContent = qty; }
  };
  document.getElementById('detailQtyPlus').onclick = () => {
    qty++; document.getElementById('detailQty').textContent = qty;
  };
  document.getElementById('detailAddCart').onclick = () => {
    addToCart(product.id, qty);
    closeProductModal();
  };

  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

// ===== MENSAJES =====
function openMessages() {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  State.conversations = JSON.parse(localStorage.getItem('mp_conversations') || 'null') || MOCK_CONVERSATIONS;
  renderConversations();
  document.getElementById('messagesPanel').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function renderConversations() {
  const list = document.getElementById('conversationsList');
  if (State.conversations.length === 0) {
    list.innerHTML = '<p style="padding:24px;text-align:center;color:var(--text-muted)">No tienes conversaciones aún</p>';
    return;
  }
  list.innerHTML = State.conversations.map(c => `
    <div class="conv-item ${State.activeConversation?.id === c.id ? 'active' : ''}" data-id="${c.id}">
      <img src="${c.store_logo}" alt="">
      <div class="conv-info">
        <div class="conv-name">${c.store_name}</div>
        <div class="conv-preview">${c.last_message}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = State.conversations.find(c => c.id === item.dataset.id);
      openChat(conv);
    });
  });
}

function openChat(conv) {
  State.activeConversation = conv;
  conv.unread = 0;
  updateMsgBadge();
  document.getElementById('chatArea').classList.remove('hidden');
  document.getElementById('chatHeader').textContent = conv.store_name;
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = (conv.messages || []).map(m => `
    <div class="msg ${m.from === 'user' ? 'sent' : 'received'}">${m.text}</div>
  `).join('');
  msgs.scrollTop = msgs.scrollHeight;
  renderConversations();
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !State.activeConversation) return;

  State.activeConversation.messages.push({
    id: Date.now(),
    from: 'user',
    text,
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  });
  State.activeConversation.last_message = text;
  State.activeConversation.last_time = 'Ahora';

  // Respuesta automática demo
  setTimeout(() => {
    State.activeConversation.messages.push({
      id: Date.now() + 1,
      from: 'store',
      text: '¡Gracias por tu mensaje! Te responderemos pronto. (Demo)',
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    });
    openChat(State.activeConversation);
    localStorage.setItem('mp_conversations', JSON.stringify(State.conversations));
  }, 1000);

  input.value = '';
  openChat(State.activeConversation);
  localStorage.setItem('mp_conversations', JSON.stringify(State.conversations));
}

// ===== NOTIFICACIONES =====
function loadNotifications() {
  const stored = localStorage.getItem('mp_notifications');
  State.notifications = stored ? JSON.parse(stored) : [...MOCK_NOTIFICATIONS];
  updateNotifBadge();
}

function openNotifications() {
  if (!Auth.isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  loadNotifications();
  const list = document.getElementById('notifList');
  if (State.notifications.length === 0) {
    list.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">No hay notificaciones</p>';
  } else {
    list.innerHTML = State.notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    `).join('');

    // Marcar como leídas
    State.notifications.forEach(n => n.read = true);
    localStorage.setItem('mp_notifications', JSON.stringify(State.notifications));
    updateNotifBadge();
  }
  document.getElementById('notifPanel').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

// ===== AUTH UI =====
function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.querySelectorAll('.auth-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

function updateAuthUI() {
  const guest = document.getElementById('guestActions');
  const userAct = document.getElementById('userActions');
  if (Auth.isLoggedIn()) {
    guest.classList.add('hidden');
    userAct.classList.remove('hidden');
    const u = Auth.getUser();
    document.getElementById('userAvatar').src = u.avatar;
    // Mostrar paneles según rol
    document.getElementById('goSellerPanel').classList.toggle('hidden', !Auth.isSeller());
    document.getElementById('goAdminPanel').classList.toggle('hidden', !Auth.isAdmin());
  } else {
    guest.classList.remove('hidden');
    userAct.classList.add('hidden');
  }
}

// ===== PANELES =====
function closeAllPanels() {
  document.getElementById('cartPanel').classList.add('hidden');
  document.getElementById('messagesPanel').classList.add('hidden');
  document.getElementById('notifPanel').classList.add('hidden');
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('userDropdown').classList.add('hidden');
}

// ===== DARK MODE =====
function initTheme() {
  const saved = localStorage.getItem('mp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = saved === 'dark';
}

function toggleTheme(dark) {
  const theme = dark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mp_theme', theme);
}

// ===== INIT =====
async function init() {
  initTheme();
  await Auth.init();
  updateAuthUI();
  updateCartBadge();
  loadNotifications();
  updateMsgBadge();

  // Navegación
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const view = el.dataset.view;
      if (view === 'inicio') {
        document.querySelector('#view-inicio .section-header h1').textContent = 'Todos los productos';
      }
      switchView(view);
    });
  });

  // Auth buttons
  document.getElementById('btnLogin').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btnRegister').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('closeAuth').addEventListener('click', closeAuthModal);

  document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => openAuthModal(tab.dataset.tab));
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await Auth.login(
        document.getElementById('loginEmail').value.trim(),
        document.getElementById('loginPassword').value
      );
      closeAuthModal();
      updateAuthUI();
      toast('¡Bienvenido de nuevo!', 'success');
    } catch (err) {
      toast(err.message || 'Error al iniciar sesión', 'error');
    }
  });

  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('regPassword').value;
    const pass2 = document.getElementById('regPassword2').value;
    if (pass !== pass2) {
      toast('Las contraseñas no coinciden', 'error');
      return;
    }
    try {
      await Auth.register(
        document.getElementById('regEmail').value.trim(),
        pass,
        document.getElementById('regName').value.trim()
      );
      closeAuthModal();
      updateAuthUI();
      toast('Cuenta creada. ¡Bienvenido!', 'success');
      if (CONFIG.DEMO_MODE) {
        toast('En modo demo el email se verifica automáticamente');
      } else {
        toast('Revisa tu correo para verificar la cuenta');
      }
    } catch (err) {
      toast(err.message || 'Error al registrarse', 'error');
    }
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', async (e) => {
    e.preventDefault();
    await Auth.logout();
    updateAuthUI();
    switchView('inicio');
    toast('Sesión cerrada');
  });

  // Avatar dropdown
  document.getElementById('avatarBtn').addEventListener('click', () => {
    document.getElementById('userDropdown').classList.toggle('hidden');
  });

  // Cart
  document.getElementById('btnCart').addEventListener('click', () => {
    renderCart();
    document.getElementById('cartPanel').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  });
  document.getElementById('closeCart').addEventListener('click', closeAllPanels);
  document.getElementById('btnCheckout').addEventListener('click', checkout);

  // Messages
  document.getElementById('btnMessages').addEventListener('click', openMessages);
  document.getElementById('closeMessages').addEventListener('click', closeAllPanels);
  document.getElementById('sendMsg').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Notifications
  document.getElementById('btnNotifications').addEventListener('click', openNotifications);
  document.getElementById('closeNotif').addEventListener('click', closeAllPanels);

  // Product modal
  document.getElementById('closeProduct').addEventListener('click', closeProductModal);

  // Overlay
  document.getElementById('overlay').addEventListener('click', closeAllPanels);

  // Filters
  document.getElementById('categoryFilter')?.addEventListener('change', renderProducts);
  document.getElementById('sortFilter')?.addEventListener('change', renderProducts);
  document.getElementById('searchInput')?.addEventListener('input', debounce(renderProducts, 300));

  // Profile form
  document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!Auth.isLoggedIn()) return;
    const updates = {
      full_name: document.getElementById('profName').value.trim(),
      phone: document.getElementById('profPhone').value.trim(),
      age: document.getElementById('profAge').value ? +document.getElementById('profAge').value : null,
      address: document.getElementById('profAddress').value.trim(),
      notes: document.getElementById('profNotes').value.trim(),
    };
    try {
      await DataService.updateProfile(Auth.getUser().id, updates);
      // Actualizar usuario local
      Object.assign(Auth.currentUser, {
        name: updates.full_name,
        phone: updates.phone,
        age: updates.age,
        address: updates.address,
        notes: updates.notes,
      });
      if (CONFIG.DEMO_MODE) {
        localStorage.setItem('mp_user', JSON.stringify(Auth.currentUser));
        // También actualizar en mp_users
        const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
        const idx = users.findIndex(u => u.id === Auth.currentUser.id);
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...Auth.currentUser };
          localStorage.setItem('mp_users', JSON.stringify(users));
        }
      }
      updateAuthUI();
      toast('Perfil actualizado', 'success');
    } catch (err) {
      toast(err.message || 'Error al guardar', 'error');
    }
  });

  // Dark mode
  document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
    toggleTheme(e.target.checked);
  });

  // Seller / Admin links
  document.getElementById('goSellerPanel')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'seller.html';
  });
  document.getElementById('goAdminPanel')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'admin.html';
  });

  // Cargar vista inicial
  switchView('inicio');
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Callback de auth change
window.onAuthChange = (user) => {
  updateAuthUI();
};

// Arrancar
document.addEventListener('DOMContentLoaded', init);
