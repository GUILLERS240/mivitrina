/**
 * Mi Vitrina — badges verificados, reseñas, favoritos, ubicación
 */
(function () {
  const CUBA = {
    'Pinar del Río': ['Pinar del Río', 'Consolación del Sur', 'San Juan y Martínez', 'Viñales', 'Mantua'],
    'Artemisa': ['Artemisa', 'Bauta', 'Guanajay', 'San Antonio de los Baños', 'Güira de Melena'],
    'La Habana': ['Plaza de la Revolución', 'Centro Habana', 'Habana Vieja', 'Playa', 'Marianao', 'Cerro', 'Diez de Octubre', 'Boyeros', 'Arroyo Naranjo', 'San Miguel del Padrón', 'Habana del Este', 'Regla', 'Cotorro', 'Guanabacoa', 'La Lisa'],
    'Mayabeque': ['San José de las Lajas', 'Güines', 'Bejucal', 'Santa Cruz del Norte', 'Melena del Sur'],
    'Matanzas': ['Matanzas', 'Cárdenas', 'Colón', 'Jovellanos', 'Varadero', 'Jagüey Grande'],
    'Cienfuegos': ['Cienfuegos', 'Rodas', 'Cruces', 'Palmira', 'Abreus'],
    'Villa Clara': ['Santa Clara', 'Remedios', 'Sagua la Grande', 'Placetas', 'Caibarién'],
    'Sancti Spíritus': ['Sancti Spíritus', 'Trinidad', 'Cabaiguán', 'Fomento', 'Yaguajay'],
    'Ciego de Ávila': ['Ciego de Ávila', 'Morón', 'Venezuela', 'Baraguá', 'Majagua'],
    'Camagüey': ['Camagüey', 'Florida', 'Nuevitas', 'Santa Cruz del Sur', 'Guáimaro'],
    'Las Tunas': ['Las Tunas', 'Puerto Padre', 'Jobabo', 'Colombia', 'Manatí'],
    'Holguín': ['Holguín', 'Moa', 'Banes', 'Gibara', 'Mayarí'],
    'Granma': ['Bayamo', 'Manzanillo', 'Niquero', 'Jiguaní', 'Media Luna'],
    'Santiago de Cuba': ['Santiago de Cuba', 'Palma Soriano', 'Contramaestre', 'San Luis', 'Songo-La Maya'],
    'Guantánamo': ['Guantánamo', 'Baracoa', 'Maisí', 'Imías', 'San Antonio del Sur'],
    'Isla de la Juventud': ['Nueva Gerona', 'La Fe'],
  };

  function starsHTML(rating) {
    const r = Number(rating) || 0;
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    let h = '<span class="stars-row" title="' + r.toFixed(1) + '">';
    for (let i = 0; i < 5; i++) {
      if (i < full) h += '<i class="fas fa-star star-on"></i>';
      else if (i === full && half) h += '<i class="fas fa-star-half-alt star-on"></i>';
      else h += '<i class="far fa-star star-off"></i>';
    }
    h += '<span class="stars-num">' + (r ? r.toFixed(1) : '—') + '</span></span>';
    return h;
  }

  function verifiedBadge(store) {
    if (!store) return '';
    const mem = (store.membership || '').toLowerCase();
    if (mem === 'vip' || mem === 'premium') {
      return '<span class="badge-verified gold" title="Membresía ' + mem.toUpperCase() + '"><i class="fas fa-check-circle"></i></span>';
    }
    if (store.verified) {
      return '<span class="badge-verified blue" title="Tienda verificada"><i class="fas fa-check-circle"></i></span>';
    }
    return '';
  }

  const Fav = {
    key: 'mp_wishlist',
    get() {
      try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (_) { return []; }
    },
    set(ids) { localStorage.setItem(this.key, JSON.stringify(ids)); },
    has(id) { return this.get().includes(id); },
    async syncFromServer() {
      if (!window.sb || typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
      try {
        const { data } = await sb.from('favorites').select('product_id').eq('user_id', Auth.getUser().id);
        if (data) this.set(data.map((r) => r.product_id));
      } catch (e) { console.warn('fav sync', e); }
    },
    async toggle(id) {
      const list = this.get();
      const i = list.indexOf(id);
      const on = i < 0;
      if (on) list.push(id); else list.splice(i, 1);
      this.set(list);
      if (window.sb && Auth.isLoggedIn()) {
        try {
          if (on) await sb.from('favorites').upsert({ user_id: Auth.getUser().id, product_id: id });
          else await sb.from('favorites').delete().eq('user_id', Auth.getUser().id).eq('product_id', id);
        } catch (e) { console.warn('fav', e); }
      }
      return on;
    },
  };
  window.Wishlist = Object.assign(window.Wishlist || {}, Fav);
  window.Fav = Fav;

  window.productCardHTML = function (p, storeName) {
    const store = (window.State && State.stores || []).find((s) => s.id === p.store_id) || {};
    const discount = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const img = p.image || 'https://via.placeholder.com/400?text=Producto';
    const liked = Fav.has(p.id);
    const price = typeof formatPrice === 'function' ? formatPrice(p.price) : '$' + p.price;
    const oldP = p.old_price && typeof formatPrice === 'function' ? formatPrice(p.old_price) : (p.old_price ? '$' + p.old_price : '');
    return (
      '<div class="product-card" data-id="' + p.id + '">' +
      '<div class="img-wrap">' +
      (discount > 0 ? '<span class="badge-discount">-' + discount + '%</span>' : '') +
      '<button type="button" class="btn-fav ' + (liked ? 'active' : '') + '" data-fav="' + p.id + '" aria-label="Favorito"><i class="' + (liked ? 'fas' : 'far') + ' fa-heart"></i></button>' +
      '<img src="' + img + '" alt="' + (p.name || '') + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/400?text=Producto\'">' +
      '</div><div class="info">' +
      '<div class="title">' + p.name + '</div>' +
      '<div class="store-name"><i class="fas fa-store"></i> ' + storeName + ' ' + verifiedBadge(store) + '</div>' +
      starsHTML(p.rating) +
      '<div class="price">' + price + (oldP ? '<small>' + oldP + '</small>' : '') + '</div>' +
      '</div>' +
      '<button class="add-btn" data-add="' + p.id + '"><i class="fas fa-cart-plus"></i> Agregar al carrito</button></div>'
    );
  };

  const _bind = window.bindProductCardEvents;
  window.bindProductCardEvents = function (grid) {
    if (typeof _bind === 'function') _bind(grid);
    grid.querySelectorAll('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
          if (typeof openAuthModal === 'function') openAuthModal('login');
          return;
        }
        const id = btn.dataset.fav;
        const on = await Fav.toggle(id);
        btn.classList.toggle('active', on);
        const ic = btn.querySelector('i');
        if (ic) ic.className = (on ? 'fas' : 'far') + ' fa-heart';
        if (typeof toast === 'function') toast(on ? 'Añadido a favoritos' : 'Quitado de favoritos');
      });
    });
  };

  async function renderStoresEnhanced() {
    const grid = document.getElementById('storesGrid');
    if (!grid) return;
    grid.innerHTML = typeof storeSkeletonHTML === 'function' ? storeSkeletonHTML(4) : '';
    await new Promise((r) => setTimeout(r, 280));
    let stores = [];
    try { stores = await DataService.getStores(); } catch (_) {}
    const loc = getLocationPref();
    if (loc && loc.province && !loc.all) {
      stores = stores.filter((s) => !s.province || s.province === loc.province);
      if (loc.municipality) {
        const m = stores.filter((s) => s.municipality === loc.municipality);
        if (m.length) stores = m;
      }
    }
    if (window.State) State.stores = stores;
    if (!stores.length) {
      grid.innerHTML = '<div class="empty-state-block" style="grid-column:1/-1"><i class="fas fa-store"></i><p><strong>No hay tiendas en esta zona</strong></p><p>Cambia tu ubicación o elige ver todas.</p></div>';
      return;
    }
    grid.innerHTML = stores.map((s) => {
      const banner = s.banner ? 'background-image:url(' + s.banner + ')' : '';
      return (
        '<div class="store-card" data-id="' + s.id + '">' +
        '<div class="banner" style="' + banner + '"></div>' +
        '<img class="logo-img" src="' + (s.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name || 'T') + '&background=146eb4&color=fff') + '" alt="">' +
        '<div class="info"><h3>' + s.name + ' ' + verifiedBadge(s) + '</h3>' +
        '<p>' + (s.description || '') + '</p>' + starsHTML(s.rating) +
        '<div class="meta">' + (s.province ? '<span><i class="fas fa-location-dot"></i> ' + s.province + (s.municipality ? ', ' + s.municipality : '') + '</span>' : '') +
        '</div></div></div>'
      );
    }).join('');
    grid.querySelectorAll('.store-card').forEach((card) => {
      card.addEventListener('click', () => {
        const store = (State.stores || []).find((s) => s.id === card.dataset.id);
        if (store && store.slug) { location.href = '/tienda/' + store.slug; return; }
        if (typeof switchView === 'function') switchView('inicio');
        setTimeout(async () => {
          State.products = await DataService.getProducts({ store_id: card.dataset.id });
          const h = document.querySelector('#view-inicio .section-header h1');
          if (h) h.textContent = 'Productos de ' + ((store && store.name) || 'Tienda');
          if (typeof renderProductsFromState === 'function') renderProductsFromState();
        }, 50);
      });
    });
  }

  async function submitReview(opts) {
    if (!Auth.isLoggedIn()) throw new Error('Inicia sesión para dejar una reseña');
    if (!window.sb) throw new Error('Sin conexión');
    const payload = {
      user_id: Auth.getUser().id,
      rating: Number(opts.rating),
      comment: (opts.comment || '').trim() || null,
      product_id: opts.productId || null,
      store_id: opts.storeId || null,
    };
    let { error } = await sb.from('reviews').insert(payload);
    if (error) {
      const { error: e2 } = await sb.from('reviews').upsert(payload);
      if (e2) throw e2;
    }
    if (opts.productId) {
      const { data: rows } = await sb.from('reviews').select('rating').eq('product_id', opts.productId);
      if (rows && rows.length) {
        const avg = rows.reduce((a, b) => a + b.rating, 0) / rows.length;
        await sb.from('products').update({ rating: Math.round(avg * 10) / 10, reviews_count: rows.length }).eq('id', opts.productId);
      }
    }
    if (opts.storeId) {
      const { data: rows } = await sb.from('reviews').select('rating').eq('store_id', opts.storeId);
      if (rows && rows.length) {
        const avg = rows.reduce((a, b) => a + b.rating, 0) / rows.length;
        await sb.from('stores').update({ rating: Math.round(avg * 10) / 10, reviews_count: rows.length }).eq('id', opts.storeId);
      }
    }
  }

  window.openReviewModal = function (opts) {
    opts = opts || {};
    if (!Auth.isLoggedIn()) { openAuthModal('login'); return; }
    let modal = document.getElementById('reviewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'reviewModal';
      modal.className = 'modal hidden';
      modal.innerHTML =
        '<div class="modal-content review-modal">' +
        '<button type="button" class="close-btn" id="closeReview"><i class="fas fa-times"></i></button>' +
        '<h2>Tu reseña</h2><p class="review-target" id="reviewTarget"></p>' +
        '<div class="star-pick" id="starPick">' +
        [1, 2, 3, 4, 5].map((n) => '<button type="button" data-star="' + n + '"><i class="far fa-star"></i></button>').join('') +
        '</div><textarea id="reviewComment" rows="3" placeholder="Cuéntanos tu experiencia (opcional)"></textarea>' +
        '<button type="button" class="btn btn-primary btn-block" id="btnSubmitReview">Publicar reseña</button></div>';
      document.body.appendChild(modal);
      document.getElementById('closeReview').onclick = function () {
        modal.classList.add('hidden');
        document.getElementById('overlay') && document.getElementById('overlay').classList.add('hidden');
      };
    }
    let rating = 5;
    document.getElementById('reviewTarget').textContent = opts.title || 'Producto / Tienda';
    document.getElementById('reviewComment').value = '';
    const pick = document.getElementById('starPick');
    function paint(n) {
      rating = n;
      pick.querySelectorAll('button').forEach((b) => {
        const v = Number(b.dataset.star);
        b.querySelector('i').className = v <= n ? 'fas fa-star' : 'far fa-star';
        b.classList.toggle('on', v <= n);
      });
    }
    pick.querySelectorAll('button').forEach((b) => { b.onclick = function () { paint(Number(b.dataset.star)); }; });
    paint(5);
    document.getElementById('btnSubmitReview').onclick = async function () {
      try {
        await submitReview({ productId: opts.productId, storeId: opts.storeId, rating: rating, comment: document.getElementById('reviewComment').value });
        modal.classList.add('hidden');
        document.getElementById('overlay') && document.getElementById('overlay').classList.add('hidden');
        if (typeof toast === 'function') toast('¡Gracias por tu reseña!', 'success');
        if (typeof renderProducts === 'function') renderProducts();
      } catch (e) {
        if (typeof toast === 'function') toast(e.message || 'Error', 'error');
      }
    };
    modal.classList.remove('hidden');
    document.getElementById('overlay') && document.getElementById('overlay').classList.remove('hidden');
  };

  function getLocationPref() {
    try { return JSON.parse(localStorage.getItem('mp_location') || 'null'); } catch (_) { return null; }
  }
  function setLocationPref(obj) { localStorage.setItem('mp_location', JSON.stringify(obj)); }

  function ensureLocationModal() {
    if (document.getElementById('locationModal')) return;
    const el = document.createElement('div');
    el.id = 'locationModal';
    el.className = 'modal hidden';
    el.innerHTML =
      '<div class="modal-content location-modal">' +
      '<h2><i class="fas fa-location-dot"></i> ¿Dónde quieres comprar?</h2>' +
      '<p class="loc-hint">Elige provincia y municipio para ver tiendas cercanas. Puedes cambiarlo después o ver todas.</p>' +
      '<div class="form-group"><label>Provincia</label><select id="locProvince"><option value="">Selecciona provincia</option>' +
      Object.keys(CUBA).map((p) => '<option value="' + p + '">' + p + '</option>').join('') +
      '</select></div>' +
      '<div class="form-group"><label>Municipio</label><select id="locMunicipality" disabled><option value="">Primero elige provincia</option></select></div>' +
      '<label class="loc-all"><input type="checkbox" id="locAll"> Ver todas las tiendas del país</label>' +
      '<button type="button" class="btn btn-primary btn-block" id="btnSaveLocation">Continuar</button></div>';
    document.body.appendChild(el);
    document.getElementById('locProvince').addEventListener('change', function () {
      const mun = document.getElementById('locMunicipality');
      const list = CUBA[this.value] || [];
      mun.disabled = !list.length;
      mun.innerHTML = '<option value="">Todos los municipios</option>' + list.map((m) => '<option value="' + m + '">' + m + '</option>').join('');
    });
    document.getElementById('locAll').addEventListener('change', function () {
      document.getElementById('locProvince').disabled = this.checked;
      document.getElementById('locMunicipality').disabled = this.checked;
    });
    document.getElementById('btnSaveLocation').addEventListener('click', async function () {
      const all = document.getElementById('locAll').checked;
      const province = all ? '' : document.getElementById('locProvince').value;
      const municipality = all ? '' : document.getElementById('locMunicipality').value;
      if (!all && !province) {
        if (typeof toast === 'function') toast('Elige una provincia o marca ver todas', 'error');
        return;
      }
      setLocationPref({ all: !!all, province: province, municipality: municipality, setAt: Date.now() });
      if (window.sb && Auth.isLoggedIn()) {
        try {
          await sb.from('profiles').update({
            preferred_province: province || null,
            preferred_municipality: municipality || null,
            location_set: true,
          }).eq('id', Auth.getUser().id);
        } catch (_) {}
      }
      el.classList.add('hidden');
      document.getElementById('overlay') && document.getElementById('overlay').classList.add('hidden');
      if (typeof toast === 'function') toast(all ? 'Mostrando todas las tiendas' : 'Ubicación: ' + province, 'success');
      if (typeof renderProducts === 'function') renderProducts();
      if (window.State && State.currentView === 'tiendas') renderStoresEnhanced();
    });
  }

  function maybeShowLocationPopup() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    const pref = getLocationPref();
    if (pref && pref.setAt) return;
    ensureLocationModal();
    document.getElementById('locationModal').classList.remove('hidden');
    document.getElementById('overlay') && document.getElementById('overlay').classList.remove('hidden');
  }

  const prevOnAuth = window.onAuthChange;
  window.onAuthChange = function () {
    if (typeof prevOnAuth === 'function') prevOnAuth();
    Fav.syncFromServer();
    setTimeout(maybeShowLocationPopup, 700);
  };

  const _switch = window.switchView;
  if (typeof _switch === 'function') {
    window.switchView = function (viewName) {
      _switch(viewName);
      if (viewName === 'tiendas') setTimeout(renderStoresEnhanced, 40);
    };
  }

  function boot() {
    ensureLocationModal();
    Fav.syncFromServer();
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) setTimeout(maybeShowLocationPopup, 1000);
    setTimeout(function () {
      const orig = window.openProductModal;
      if (typeof orig !== 'function' || orig._social) return;
      window.openProductModal = function (id) {
        orig(id);
        setTimeout(function () {
          const body = document.querySelector('#productDetail .pds-body') || document.getElementById('productDetail');
          if (!body || body.querySelector('[data-review-product]')) return;
          const p = (State.products || []).find((x) => x.id === id);
          const wrap = document.createElement('div');
          wrap.className = 'pds-review-row';
          wrap.innerHTML = starsHTML(p && p.rating) +
            ' <button type="button" class="btn btn-outline btn-sm" data-review-product="' + id +
            '" data-review-title="' + ((p && p.name) || '') +
            '"><i class="fas fa-pen"></i> Dejar reseña</button>';
          body.appendChild(wrap);
          wrap.querySelector('[data-review-product]').onclick = function (e) {
            e.preventDefault();
            openReviewModal({ productId: id, title: (p && p.name) || 'Producto' });
          };
        }, 80);
      };
      window.openProductModal._social = true;
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 250); });
  } else {
    setTimeout(boot, 250);
  }

  window.renderStoresEnhanced = renderStoresEnhanced;
  window.getLocationPref = getLocationPref;
  window.CUBA_PROVINCES = CUBA;
})();
