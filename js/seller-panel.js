/** Panel Vendedor - Mi Vitrina (real Supabase) */
let myStore = null;
let myProducts = [];
let myOrders = [];
let myPromos = [];

function toast(msg, type = '') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function formatPrice(n) {
  return (CONFIG.CURRENCY_SYMBOL || '$') + Number(n || 0).toLocaleString('es-CO');
}
function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

function showSection(name) {
  document.querySelectorAll('.seller-nav a[data-section]').forEach((a) =>
    a.classList.toggle('active', a.dataset.section === name)
  );
  document.querySelectorAll('.seller-section').forEach((s) => s.classList.remove('active'));
  document.getElementById('sec-' + name)?.classList.add('active');
  const titles = {
    dashboard: 'Acceso rápido',
    products: 'Productos',
    orders: 'Pedidos',
    promos: 'Promociones',
    store: 'Mi Tienda',
    payments: 'Pagos / QR',
  };
  document.getElementById('sectionTitle').textContent = titles[name] || name;
  if (name === 'products') renderProducts();
  if (name === 'orders') renderOrders();
  if (name === 'promos') renderPromos();
  if (name === 'store') fillStoreForm();
  if (name === 'payments') fillPaymentForm();
  if (name === 'dashboard') renderDashboard();
}

async function loadMyStore() {
  if (!window.sb) return;
  const { data } = await sb.from('stores').select('*').eq('owner_id', Auth.getUser().id).maybeSingle();
  myStore = data;
}
async function loadProducts() {
  if (!myStore || !window.sb) {
    myProducts = [];
    return;
  }
  const { data } = await sb
    .from('products')
    .select('*')
    .eq('store_id', myStore.id)
    .order('created_at', { ascending: false });
  myProducts = data || [];
}
async function loadOrders() {
  if (!myStore || !window.sb) {
    myOrders = [];
    return;
  }
  const { data } = await sb
    .from('orders')
    .select('*, profiles(full_name, phone), order_items(*)')
    .eq('store_id', myStore.id)
    .order('created_at', { ascending: false });
  myOrders = data || [];
}
async function loadPromos() {
  if (!myStore || !window.sb) {
    myPromos = [];
    return;
  }
  const { data } = await sb
    .from('promo_codes')
    .select('*')
    .eq('store_id', myStore.id)
    .order('created_at', { ascending: false });
  myPromos = data || [];
}

function renderDashboard() {
  document.getElementById('statProducts').textContent = myProducts.length;
  document.getElementById('statPending').textContent = myOrders.filter((o) => o.status === 'pendiente').length;
  document.getElementById('statPayPending').textContent = myOrders.filter(
    (o) => o.payment_status === 'marcado_pagado'
  ).length;
  const sales = myOrders
    .filter((o) => o.status !== 'cancelado')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  document.getElementById('statSales').textContent = formatPrice(sales);
  const tbody = document.getElementById('recentOrdersBody');
  if (!myOrders.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin pedidos</td></tr>';
    return;
  }
  tbody.innerHTML = myOrders
    .slice(0, 6)
    .map((o) => {
      const name = o.profiles?.full_name || o.payer_name || 'Cliente';
      const pay = o.payment_status || 'pendiente';
      return `<tr>
      <td>#${String(o.id).slice(-6)}</td>
      <td>${name}</td>
      <td>${formatPrice(o.total)}</td>
      <td>${pay}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td>${o.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" onclick="acceptOrder('${o.id}')">Aceptar</button>` : ''}</td>
    </tr>`;
    })
    .join('');
}

function renderProducts() {
  const tbody = document.getElementById('productsBody');
  if (!myProducts.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No tienes productos. ¡Crea el primero!</td></tr>';
    return;
  }
  tbody.innerHTML = myProducts
    .map(
      (p) => `<tr>
    <td><img src="${p.image || 'https://via.placeholder.com/40'}" style="width:36px;height:36px;border-radius:4px;object-fit:cover"></td>
    <td>${p.name}</td>
    <td>${formatPrice(p.price)}</td>
    <td>${p.stock ?? '—'}</td>
    <td>
      <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
    </td>
  </tr>`
    )
    .join('');
}

function renderOrders() {
  const alerts = document.getElementById('paymentAlerts');
  const marked = myOrders.filter((o) => o.payment_status === 'marcado_pagado');
  alerts.innerHTML = marked
    .map(
      (o) => `
    <div class="payment-alert">
      <strong>Pago marcado</strong> — Pedido #${String(o.id).slice(-6)}<br>
      Nombre: ${o.payer_name || o.profiles?.full_name || '—'} · Tel: ${o.payer_phone || o.profiles?.phone || '—'}<br>
      <button class="btn btn-sm btn-primary" style="margin-top:6px" onclick="confirmPayment('${o.id}')">Confirmar pago</button>
      <button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="rejectPayment('${o.id}')">Rechazar</button>
    </div>`
    )
    .join('');
  const tbody = document.getElementById('ordersBody');
  if (!myOrders.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Sin pedidos</td></tr>';
    return;
  }
  tbody.innerHTML = myOrders
    .map((o) => {
      const name = o.payer_name || o.profiles?.full_name || 'Cliente';
      const phone = o.payer_phone || o.profiles?.phone || '—';
      return `<tr>
      <td>#${String(o.id).slice(-6)}</td>
      <td>${name}<br><small>${phone}</small></td>
      <td>${formatPrice(o.total)}</td>
      <td>${o.payment_status || 'pendiente'}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td>
        ${o.status === 'pendiente' ? `<button class="btn btn-sm btn-primary" onclick="acceptOrder('${o.id}')">Aceptar</button>` : ''}
        ${o.payment_status === 'marcado_pagado' ? `<button class="btn btn-sm btn-secondary" onclick="confirmPayment('${o.id}')">Confirmar $</button>` : ''}
      </td>
    </tr>`;
    })
    .join('');
}

function renderPromos() {
  const tbody = document.getElementById('promosBody');
  if (!myPromos.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Sin códigos</td></tr>';
    return;
  }
  tbody.innerHTML = myPromos
    .map(
      (p) => `<tr>
    <td><strong>${p.code}</strong></td>
    <td>${p.discount_percent ? p.discount_percent + '%' : formatPrice(p.discount_amount || 0)}</td>
    <td>${p.used_count || 0}${p.max_uses ? ' / ' + p.max_uses : ''}</td>
    <td>${p.active ? 'Sí' : 'No'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="deletePromo('${p.id}')"><i class="fas fa-trash"></i></button></td>
  </tr>`
    )
    .join('');
}

function fillStoreForm() {
  if (!myStore) return;
  document.getElementById('storeName').value = myStore.name || '';
  document.getElementById('storeSlug').value = myStore.slug || '';
  document.getElementById('storeDesc').value = myStore.description || '';
  document.getElementById('storeCategory').value = myStore.category || 'general';
  document.getElementById('storeLogo').value = myStore.logo || '';
  document.getElementById('storeBanner').value = myStore.banner || '';
  updateStoreLinkPreview();
}
function fillPaymentForm() {
  if (!myStore) return;
  document.getElementById('payMethod').value = myStore.payment_method || '';
  document.getElementById('payPhone').value = myStore.payment_phone || '';
  document.getElementById('payCard').value = myStore.payment_card || '';
  document.getElementById('payQrUrl').value = myStore.payment_qr_url || '';
}
function updateStoreLinkPreview() {
  const slug = document.getElementById('storeSlug').value || '—';
  document.getElementById('storeLinkPreview').textContent =
    'Tu tienda: ' + location.origin + '/tienda/' + slug;
}
function genStoreQr() {
  const slug = (myStore?.slug || document.getElementById('storeSlug').value || '').trim();
  if (!slug) {
    toast('Define el slug primero');
    return;
  }
  const url = encodeURIComponent(location.origin + '/tienda/' + slug);
  const img = document.getElementById('storeQrImg');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}`;
  img.style.display = 'block';
}

async function saveProduct(e) {
  e.preventDefault();
  if (!myStore) {
    toast('Configura tu tienda primero', 'error');
    showSection('store');
    return;
  }
  const editId = document.getElementById('prodEditId').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
  }
  try {
    let imageUrl = document.getElementById('prodImage').value.trim() || null;
    const fileInput = document.getElementById('prodImageFile');
    if (fileInput?.files?.[0]) {
      toast('Subiendo imagen...');
      imageUrl = await DataService.uploadImage(fileInput.files[0], 'products');
      document.getElementById('prodImage').value = imageUrl;
    }
    if (!imageUrl && !editId) throw new Error('Debes subir una imagen del producto');
    const payload = {
      store_id: myStore.id,
      name: document.getElementById('prodName').value.trim(),
      description: document.getElementById('prodDesc').value.trim() || null,
      price: +document.getElementById('prodPrice').value,
      old_price: document.getElementById('prodOldPrice').value
        ? +document.getElementById('prodOldPrice').value
        : null,
      stock: +document.getElementById('prodStock').value || 0,
      category: document.getElementById('prodCategory').value,
      image: imageUrl,
      active: true,
    };
    if (editId) await DataService.updateProduct(editId, payload);
    else await DataService.createProduct(payload);
    toast('Producto publicado. Ya aparece en Inicio.', 'success');
    document.getElementById('productFormWrap').classList.add('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('prodImagePreview').style.display = 'none';
    document.getElementById('prodEditId').value = '';
    await loadProducts();
    renderProducts();
    renderDashboard();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Error al guardar', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  }
}

window.editProduct = function (id) {
  const p = myProducts.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodOldPrice').value = p.old_price || '';
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodCategory').value = p.category || 'otros';
  document.getElementById('prodImage').value = p.image || '';
  const prev = document.getElementById('prodImagePreview');
  if (p.image) {
    prev.src = p.image;
    prev.style.display = 'block';
  }
  document.getElementById('formTitle').textContent = 'Editar producto';
  document.getElementById('productFormWrap').classList.remove('hidden');
};

window.deleteProduct = async function (id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    await DataService.deleteProduct(id);
    toast('Eliminado');
    await loadProducts();
    renderProducts();
    renderDashboard();
  } catch (e) {
    toast(e.message || 'Error', 'error');
  }
};

window.acceptOrder = async function (id) {
  const { error } = await sb
    .from('orders')
    .update({ status: 'aceptado', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    toast(error.message, 'error');
    return;
  }
  toast('Pedido aceptado', 'success');
  await loadOrders();
  renderOrders();
  renderDashboard();
};
window.confirmPayment = async function (id) {
  const { error } = await sb
    .from('orders')
    .update({ payment_status: 'confirmado', status: 'aceptado', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    toast(error.message, 'error');
    return;
  }
  toast('Pago confirmado', 'success');
  await loadOrders();
  renderOrders();
  renderDashboard();
};
window.rejectPayment = async function (id) {
  await sb.from('orders').update({ payment_status: 'rechazado' }).eq('id', id);
  toast('Pago rechazado');
  await loadOrders();
  renderOrders();
  renderDashboard();
};
window.deletePromo = async function (id) {
  if (!confirm('¿Eliminar código?')) return;
  await sb.from('promo_codes').delete().eq('id', id);
  await loadPromos();
  renderPromos();
};

async function init() {
  await Auth.init();
  if (!Auth.isLoggedIn()) {
    alert('Debes iniciar sesión');
    location.href = 'index.html';
    return;
  }
  if (!Auth.isSeller() && !Auth.isAdmin()) {
    alert('No eres vendedor. Solicítalo desde tu perfil.');
    location.href = 'index.html';
    return;
  }
  document.getElementById('sellerName').textContent = Auth.getUser().name;

  document.querySelectorAll('.seller-nav a[data-section]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(a.dataset.section);
    });
  });
  document.querySelectorAll('.quick-card[data-goto]').forEach((card) => {
    card.addEventListener('click', () => {
      showSection(card.dataset.goto);
      if (card.dataset.action === 'new') {
        document.getElementById('productFormWrap').classList.remove('hidden');
        document.getElementById('productForm').reset();
        document.getElementById('prodEditId').value = '';
        document.getElementById('formTitle').textContent = 'Nuevo producto';
        document.getElementById('prodImagePreview').style.display = 'none';
      }
    });
  });

  await loadMyStore();
  await loadProducts();
  await loadOrders();
  await loadPromos();
  renderDashboard();

  document.getElementById('btnNewProduct').onclick = () => {
    document.getElementById('productFormWrap').classList.remove('hidden');
    document.getElementById('productForm').reset();
    document.getElementById('prodEditId').value = '';
    document.getElementById('formTitle').textContent = 'Nuevo producto';
    document.getElementById('prodImagePreview').style.display = 'none';
  };
  document.getElementById('cancelProduct').onclick = () =>
    document.getElementById('productFormWrap').classList.add('hidden');
  document.getElementById('productForm').onsubmit = saveProduct;
  document.getElementById('prodImageFile')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    const prev = document.getElementById('prodImagePreview');
    if (f && prev) {
      prev.src = URL.createObjectURL(f);
      prev.style.display = 'block';
    }
  });

  document.getElementById('storeName')?.addEventListener('input', (e) => {
    if (!document.getElementById('storeSlug').dataset.manual) {
      document.getElementById('storeSlug').value = slugify(e.target.value);
      updateStoreLinkPreview();
    }
  });
  document.getElementById('storeSlug')?.addEventListener('input', () => {
    document.getElementById('storeSlug').dataset.manual = '1';
    updateStoreLinkPreview();
  });
  document.getElementById('storeForm').onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('storeName').value.trim(),
      slug: document.getElementById('storeSlug').value.trim().toLowerCase(),
      description: document.getElementById('storeDesc').value.trim() || null,
      category: document.getElementById('storeCategory').value,
      logo: document.getElementById('storeLogo').value.trim() || null,
      banner: document.getElementById('storeBanner').value.trim() || null,
      owner_id: Auth.getUser().id,
      active: true,
    };
    try {
      if (myStore) {
        const { data, error } = await sb.from('stores').update(payload).eq('id', myStore.id).select().single();
        if (error) throw error;
        myStore = data;
      } else {
        const { data, error } = await sb.from('stores').insert(payload).select().single();
        if (error) throw error;
        myStore = data;
      }
      toast('Tienda guardada', 'success');
      updateStoreLinkPreview();
      genStoreQr();
    } catch (err) {
      toast(err.message || 'Error', 'error');
    }
  };
  document.getElementById('paymentForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!myStore) {
      toast('Configura tu tienda primero', 'error');
      return;
    }
    const payload = {
      payment_method: document.getElementById('payMethod').value || null,
      payment_phone: document.getElementById('payPhone').value.trim() || null,
      payment_card: document.getElementById('payCard').value.trim() || null,
      payment_qr_url: document.getElementById('payQrUrl').value.trim() || null,
    };
    const { data, error } = await sb.from('stores').update(payload).eq('id', myStore.id).select().single();
    if (error) {
      toast(error.message, 'error');
      return;
    }
    myStore = data;
    toast('Pagos guardados', 'success');
  };
  document.getElementById('btnGenStoreQr').onclick = genStoreQr;
  document.getElementById('btnOpenStore').onclick = () => {
    if (myStore?.slug) window.open('/tienda/' + myStore.slug, '_blank');
    else {
      toast('Configura el slug de tu tienda');
      showSection('store');
    }
  };
  document.getElementById('btnNewPromo').onclick = () => {
    document.getElementById('promoFormWrap').classList.remove('hidden');
  };
  document.getElementById('cancelPromo').onclick = () =>
    document.getElementById('promoFormWrap').classList.add('hidden');
  document.getElementById('promoForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!myStore) {
      toast('Configura tu tienda primero', 'error');
      return;
    }
    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    const percent = document.getElementById('promoPercent').value
      ? +document.getElementById('promoPercent').value
      : null;
    const amount = document.getElementById('promoAmount').value
      ? +document.getElementById('promoAmount').value
      : null;
    if (!percent && !amount) {
      toast('Indica % o monto', 'error');
      return;
    }
    const { error } = await sb.from('promo_codes').insert({
      store_id: myStore.id,
      code,
      discount_percent: percent,
      discount_amount: amount,
      max_uses: document.getElementById('promoMax').value
        ? +document.getElementById('promoMax').value
        : null,
      active: true,
    });
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Código creado', 'success');
    document.getElementById('promoFormWrap').classList.add('hidden');
    await loadPromos();
    renderPromos();
  };
}

document.addEventListener('DOMContentLoaded', init);
