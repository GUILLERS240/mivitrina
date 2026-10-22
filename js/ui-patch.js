/* Mi Vitrina UI patch — modal + sheets + categorías + login + wishlist/checkout */
(function () {
  function openSheet(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    document.getElementById('overlay')?.classList.remove('hidden');
  }
  function closeSheets() {
    document.querySelectorAll('.bottom-sheet').forEach((s) => {
      s.classList.remove('show');
      setTimeout(() => s.classList.add('hidden'), 280);
    });
  }
  window.openSheet = openSheet;
  window.closeSheets = closeSheets;

  function applyCategory(cat) {
    const sel = document.getElementById('categoryFilter');
    if (sel) sel.value = cat || '';
    const lab = document.getElementById('categoryLabel');
    if (lab) lab.textContent = cat || 'Categoría';
    if (typeof switchView === 'function') switchView('inicio');
    if (typeof renderProducts === 'function') renderProducts();
  }

  window.openProductModal = function (id) {
    const product = (window.State && State.products || []).find((p) => p.id === id);
    if (!product) return;
    const stores = (window.State && State.stores) || [];
    const store =
      stores.find((s) => s.id === product.store_id) ||
      (product.stores ? { name: product.stores.name, slug: product.stores.slug } : { name: 'Tienda' });
    const detail = document.getElementById('productDetail');
    if (!detail) return;
    const discount =
      product.old_price && product.old_price > product.price
        ? Math.round((1 - product.price / product.old_price) * 100)
        : 0;
    const stock = product.stock != null ? product.stock : '—';
    const cat = product.category || '';
    const price = typeof formatPrice === 'function' ? formatPrice(product.price) : '$' + product.price;
    const oldP =
      product.old_price && typeof formatPrice === 'function'
        ? formatPrice(product.old_price)
        : product.old_price
          ? '$' + product.old_price
          : '';
    const inStock = product.stock == null || product.stock > 0;
    detail.innerHTML = `
      <div class="pds-img-wrap">
        <button type="button" class="pds-wish" id="detailWish" aria-label="Deseos"><i class="fas fa-heart"></i></button>
        <img src="${product.image || 'https://via.placeholder.com/400?text=Producto'}" alt="${product.name}"
          onerror="this.src='https://via.placeholder.com/400?text=Producto'">
      </div>
      <div class="pds-body">
        <h2>${product.name}</h2>
        <a class="pds-store" href="${store.slug ? '/tienda/' + store.slug : '#'}"><i class="fas fa-store"></i> ${store.name || 'Tienda'}</a>
        <div class="pds-price">${price}${oldP ? `<small>${oldP}</small>` : ''}${discount ? `<span class="badge-discount">-${discount}%</span>` : ''}</div>
        <p class="pds-desc">${product.description || 'Sin descripción'}</p>
        <div class="pds-meta">
          <span style="color:${inStock ? 'var(--success,#28a745)' : 'var(--danger)'}"><i class="fas fa-box"></i> ${inStock ? 'En stock' : 'Agotado'}: ${stock}</span>
          ${cat ? `<span><i class="fas fa-tag"></i> ${cat}</span>` : ''}
        </div>
        <div class="pds-qty">
          <label>Cantidad</label>
          <div class="pds-qty-ctrl">
            <button type="button" id="qtyMinus">−</button>
            <span id="detailQty">1</span>
            <button type="button" id="qtyPlus">+</button>
          </div>
        </div>
        <div class="pds-actions">
          <button type="button" class="btn-buy" id="detailBuyNow"><i class="fas fa-bolt"></i> Comprar ahora</button>
          <button type="button" class="btn-cart" id="detailAddCart"><i class="fas fa-cart-plus"></i> Añadir al carrito</button>
          <button type="button" class="btn-msg" id="detailMsgSeller"><i class="fas fa-comments"></i> Mensaje al vendedor</button>
        </div>
      </div>`;
    let qty = 1;
    const qtyEl = () => document.getElementById('detailQty');
    document.getElementById('qtyMinus').onclick = () => { if (qty > 1) { qty--; qtyEl().textContent = qty; } };
    document.getElementById('qtyPlus').onclick = () => { qty++; qtyEl().textContent = qty; };
    const wishBtn = document.getElementById('detailWish');
    if (wishBtn && window.Wishlist) {
      if (Wishlist.has(id)) wishBtn.classList.add('active');
      wishBtn.onclick = (e) => {
        e.stopPropagation();
        const on = Wishlist.toggle(id);
        wishBtn.classList.toggle('active', on);
        if (typeof toast === 'function') toast(on ? 'Añadido a deseos' : 'Quitado de deseos');
      };
    }
    document.getElementById('detailAddCart').onclick = () => {
      if (typeof addToCart === 'function') addToCart(id, qty);
      if (typeof closeProductModal === 'function') closeProductModal();
    };
    document.getElementById('detailBuyNow').onclick = () => {
      if (typeof addToCart === 'function') addToCart(id, qty);
      if (typeof closeProductModal === 'function') closeProductModal();
      if (typeof openCart === 'function') openCart();
    };
    document.getElementById('detailMsgSeller').onclick = async () => {
      if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
      }
      if (!product.store_id) {
        if (typeof toast === 'function') toast('Tienda no disponible');
        return;
      }
      try {
        const conv = await DataService.getOrCreateConversation(Auth.getUser().id, product.store_id);
        if (typeof closeProductModal === 'function') closeProductModal();
        if (typeof openMessages === 'function') await openMessages();
        if (typeof openChat === 'function') await openChat(conv.id, store.name || 'Vendedor');
      } catch (e) {
        if (typeof toast === 'function') toast(e.message || 'Error', 'error');
      }
    };
    document.getElementById('productModal')?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
  };

  function wireLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form || form._patched) return;
    form._patched = true;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const errEl = document.getElementById('loginError');
      const btn = document.getElementById('btnLoginSubmit') || form.querySelector('button[type="submit"]');
      const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
      const password = document.getElementById('loginPassword')?.value || '';
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
      if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
      try {
        await Auth.login(email, password);
        if (typeof closeAuthModal === 'function') closeAuthModal();
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof toast === 'function') toast('Bienvenido', 'success');
      } catch (err) {
        const msg = err.message || 'Error al iniciar sesión';
        if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
        if (typeof toast === 'function') toast(msg, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
      }
    }, true);
  }

  function wireCategories() {
    document.querySelectorAll('.home-cat[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => applyCategory(btn.dataset.cat));
    });
    document.querySelectorAll('.home-cat[data-view]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof switchView === 'function') switchView(btn.dataset.view);
      });
    });
    document.querySelectorAll('.cat-card[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => applyCategory(btn.dataset.cat));
    });
    document.getElementById('btnHeroOffers')?.addEventListener('click', () => {
      const sort = document.getElementById('sortFilter');
      if (sort) sort.value = 'precio-asc';
      const lab = document.getElementById('sortLabel');
      if (lab) lab.textContent = 'Ofertas';
      if (typeof switchView === 'function') switchView('inicio');
      if (typeof renderProducts === 'function') renderProducts();
    });
  }

  function wireSheets() {
    document.getElementById('btnOpenCategory')?.addEventListener('click', () => openSheet('sheetCategory'));
    document.getElementById('btnOpenSort')?.addEventListener('click', () => openSheet('sheetSort'));
    document.getElementById('categoryOptions')?.querySelectorAll('.sheet-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('categoryOptions').querySelectorAll('.sheet-opt').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const v = btn.dataset.value || '';
        const sel = document.getElementById('categoryFilter');
        if (sel) sel.value = v;
        const lab = document.getElementById('categoryLabel');
        if (lab) lab.textContent = v ? btn.textContent.trim() : 'Categoría';
        closeSheets();
        document.getElementById('overlay')?.classList.add('hidden');
        if (typeof renderProducts === 'function') renderProducts();
      });
    });
    document.getElementById('sortOptions')?.querySelectorAll('.sheet-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('sortOptions').querySelectorAll('.sheet-opt').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const v = btn.dataset.value || 'relevancia';
        const sel = document.getElementById('sortFilter');
        if (sel) sel.value = v;
        const lab = document.getElementById('sortLabel');
        if (lab) lab.textContent = btn.textContent.trim();
        closeSheets();
        document.getElementById('overlay')?.classList.add('hidden');
        if (typeof renderProducts === 'function') renderProducts();
      });
    });
    const ov = document.getElementById('overlay');
    if (ov && !ov._sheetWired) {
      ov._sheetWired = true;
      ov.addEventListener('click', () => closeSheets());
    }
  }

  function boot() {
    wireSheets();
    wireCategories();
    wireLoginForm();
    document.getElementById('orderFilterTabs')?.querySelectorAll('.order-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.getElementById('orderFilterTabs').querySelectorAll('.order-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const f = tab.dataset.filter || 'all';
        document.getElementById('ordersList')?.querySelectorAll('.order-card').forEach((card) => {
          const st = card.dataset.status || '';
          let show = f === 'all';
          if (f === 'pendiente') show = ['pendiente','aceptado','en_proceso'].includes(st);
          if (f === 'enviado') show = st === 'enviado';
          if (f === 'entregado') show = st === 'entregado';
          card.style.display = show ? '' : 'none';
        });
      });
    });
    document.getElementById('menuWishlist')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openWishlist === 'function') openWishlist();
    });
    document.getElementById('closeWishlist')?.addEventListener('click', () => {
      document.getElementById('wishlistPanel')?.classList.add('hidden');
      document.getElementById('overlay')?.classList.add('hidden');
    });
    document.getElementById('closeCheckout')?.addEventListener('click', () => {
      document.getElementById('checkoutPanel')?.classList.add('hidden');
      document.getElementById('overlay')?.classList.add('hidden');
    });
    document.getElementById('btnOpenMessagesHelp')?.addEventListener('click', () => {
      if (typeof openMessages === 'function') openMessages();
    });
    document.querySelectorAll('[data-scroll]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(a.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
    const chk = document.getElementById('btnCheckout');
    if (chk && !chk._feat) {
      chk._feat = true;
      chk.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof openCheckout === 'function') openCheckout();
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 120));
  } else {
    setTimeout(boot, 120);
  }
})();
