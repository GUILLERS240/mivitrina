/**
 * Checkout invitados + carrito sin login
 */
(function () {
  function toast(msg, type) {
    if (typeof window.toast === 'function') return window.toast(msg, type);
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function formatPrice(n) {
    if (typeof window.formatPrice === 'function') return window.formatPrice(n);
    return '$' + Number(n || 0).toLocaleString('es-CO');
  }

  window.addToCart = function (productId, qty) {
    qty = qty || 1;
    const product = (window.State && State.products || []).find(function (p) { return p.id === productId; });
    if (!product) {
      toast('Producto no encontrado', 'error');
      return;
    }
    const existing = State.cart.find(function (i) { return i.product_id === productId; });
    if (existing) existing.quantity += qty;
    else {
      State.cart.push({
        product_id: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        store_id: product.store_id,
        quantity: qty,
      });
    }
    if (typeof saveCart === 'function') saveCart();
    toast(product.name + ' agregado al carrito', 'success');
  };

  function openCheckoutPanel() {
    const panel = document.getElementById('checkoutPanel');
    const body = document.getElementById('checkoutBody');
    const overlay = document.getElementById('overlay');
    if (!panel || !body) return;
    const cart = (window.State && State.cart) || [];
    if (!cart.length) {
      toast('El carrito está vacío', 'error');
      return;
    }
    const total = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
    const logged = typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn();
    const u = logged ? Auth.getUser() : null;

    var guestBlock = '';
    if (!logged) {
      guestBlock =
        '<div class="checkout-card guest-checkout-card">' +
        '<h3 style="margin:0 0 10px;font-size:1rem"><i class="fas fa-user"></i> Datos de entrega (invitado)</h3>' +
        '<p style="margin:0 0 12px;font-size:0.85rem;color:var(--text-muted)">No hace falta registrarse. Completa tus datos para el envío.</p>' +
        '<div class="form-group"><label>Nombre completo *</label><input type="text" id="guestName" required placeholder="Tu nombre y apellidos" autocomplete="name"></div>' +
        '<div class="form-group"><label>Correo *</label><input type="email" id="guestEmail" required placeholder="tu@correo.com" autocomplete="email"></div>' +
        '<div class="form-group"><label>Teléfono *</label><input type="tel" id="guestPhone" required placeholder="+53 5..." autocomplete="tel"></div>' +
        '<div class="form-group"><label>Dirección de entrega *</label><textarea id="guestAddress" rows="2" required placeholder="Calle, número, municipio, provincia"></textarea></div>' +
        '<div class="form-group"><label>Notas (opcional)</label><textarea id="guestNotes" rows="2" placeholder="Referencias, horario..."></textarea></div>' +
        '</div>';
    } else {
      guestBlock =
        '<div class="checkout-card">' +
        '<p style="margin:0 0 6px"><strong>' + (u.name || '') + '</strong></p>' +
        '<p style="margin:0 0 6px;font-size:0.9rem;color:var(--text-muted)">' + (u.email || '') + '</p>' +
        '<div class="form-group"><label>Teléfono</label><input type="tel" id="guestPhone" value="' + (u.phone || '').replace(/"/g, '') + '" placeholder="Teléfono"></div>' +
        '<div class="form-group"><label>Dirección de entrega *</label><textarea id="guestAddress" rows="2" required>' + (u.address || '') + '</textarea></div>' +
        '</div>';
    }

    body.innerHTML =
      '<div class="checkout-card"><strong>Resumen</strong>' +
      cart.map(function (i) {
        return '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:0.9rem"><span>' + i.quantity + '× ' + i.name + '</span><span>' + formatPrice(i.price * i.quantity) + '</span></div>';
      }).join('') +
      '<div style="display:flex;justify-content:space-between;margin-top:12px;font-weight:700;font-size:1.05rem"><span>Total</span><span>' + formatPrice(total) + '</span></div></div>' +
      guestBlock +
      '<div class="checkout-card">' +
      '<h3 style="margin:0 0 10px;font-size:1rem"><i class="fas fa-truck"></i> Envío</h3>' +
      '<label class="pay-option"><input type="radio" name="shipMethod" value="standard" checked> <span class="co-ico"><i class="fas fa-box"></i></span> Estándar</label>' +
      '<label class="pay-option"><input type="radio" name="shipMethod" value="express"> <span class="co-ico"><i class="fas fa-bolt"></i></span> Express</label>' +
      '</div>' +
      '<div class="checkout-card">' +
      '<h3 style="margin:0 0 10px;font-size:1rem"><i class="fas fa-money-bill-wave"></i> Pago</h3>' +
      '<label class="pay-option"><input type="radio" name="payMethod" value="transferencia" checked> <span class="co-ico"><i class="fas fa-university"></i></span> Transferencia</label>' +
      '<label class="pay-option"><input type="radio" name="payMethod" value="efectivo"> <span class="co-ico"><i class="fas fa-hand-holding-dollar"></i></span> Efectivo al recibir</label>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-block" id="btnConfirmOrder" style="margin-top:8px;padding:14px">Confirmar pedido</button>' +
      (!logged ? '<p style="text-align:center;margin-top:12px;font-size:0.85rem"><a href="#" id="guestGoLogin">¿Ya tienes cuenta? Inicia sesión</a></p>' : '');

    panel.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');

    document.getElementById('guestGoLogin')?.addEventListener('click', function (e) {
      e.preventDefault();
      panel.classList.add('hidden');
      if (typeof openAuthModal === 'function') openAuthModal('login');
    });

    document.getElementById('btnConfirmOrder')?.addEventListener('click', submitGuestOrder);
  }

  async function submitGuestOrder() {
    const cart = (window.State && State.cart) || [];
    if (!cart.length) return toast('Carrito vacío', 'error');

    const logged = typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn();
    const u = logged ? Auth.getUser() : null;

    const name = logged ? (u.name || '') : (document.getElementById('guestName')?.value || '').trim();
    const email = logged ? (u.email || '') : (document.getElementById('guestEmail')?.value || '').trim();
    const phone = (document.getElementById('guestPhone')?.value || '').trim();
    const address = (document.getElementById('guestAddress')?.value || '').trim();
    const notes = (document.getElementById('guestNotes')?.value || '').trim();
    const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'transferencia';

    if (!logged) {
      if (!name || !email || !phone || !address) {
        toast('Completa nombre, correo, teléfono y dirección', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast('Correo no válido', 'error');
        return;
      }
    } else if (!address) {
      toast('Indica la dirección de entrega', 'error');
      return;
    }

    const total = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
    const btn = document.getElementById('btnConfirmOrder');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      await DataService.createOrder({
        user_id: logged ? u.id : null,
        total: total,
        shipping_address: address + (notes ? ' | Notas: ' + notes : ''),
        payment_method: payMethod,
        payer_name: name || null,
        payer_phone: phone || null,
        guest_email: logged ? null : email,
        items: cart.map(function (i) {
          return {
            product_id: i.product_id,
            name: i.name,
            image: i.image,
            quantity: i.quantity,
            unit_price: i.price,
            price: i.price,
            store_id: i.store_id,
          };
        }),
      });
      State.cart = [];
      if (typeof saveCart === 'function') saveCart();
      document.getElementById('checkoutPanel')?.classList.add('hidden');
      document.getElementById('cartPanel')?.classList.add('hidden');
      document.getElementById('overlay')?.classList.add('hidden');
      toast('¡Pedido realizado!' + (logged ? '' : ' Te contactaremos al teléfono indicado.'), 'success');
      if (logged && typeof switchView === 'function') switchView('pedidos');
    } catch (err) {
      console.error(err);
      toast(err.message || 'No se pudo crear el pedido', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
    }
  }

  function wire() {
    const btn = document.getElementById('btnCheckout');
    if (btn && !btn._guestWired) {
      btn._guestWired = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openCheckoutPanel();
      }, true);
    }
    document.getElementById('closeCheckout')?.addEventListener('click', function () {
      document.getElementById('checkoutPanel')?.classList.add('hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(wire, 200); });
  } else {
    setTimeout(wire, 200);
  }
  window.openGuestCheckout = openCheckoutPanel;
})();
