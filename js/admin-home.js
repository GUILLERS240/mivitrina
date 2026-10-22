/* Extiende panel admin: Inicio y Checkout editables */
(function () {
  function ensureNav() {
    const nav = document.querySelector('.admin-nav');
    if (!nav || nav.querySelector('[data-section="home"]')) return;
    const orders = nav.querySelector('[data-section="orders"]');
    if (!orders) return;
    orders.insertAdjacentHTML(
      'afterend',
      `<a data-section="home"><i class="fas fa-home"></i> Inicio / Apariencia</a>
       <a data-section="checkoutcfg"><i class="fas fa-cash-register"></i> Checkout</a>`
    );
  }
  function ensureSections() {
    if (document.getElementById('sec-home')) return;
    const orders = document.getElementById('sec-orders');
    if (!orders) return;
    orders.insertAdjacentHTML(
      'beforebegin',
      `<section id="sec-home" class="admin-section">
        <p style="color:var(--text-muted);margin-bottom:16px">Edita los textos de la pantalla de inicio.</p>
        <form id="homeForm" style="max-width:560px;display:flex;flex-direction:column;gap:12px">
          <div class="form-group"><label>Título del banner</label><input type="text" id="homeHeroTitle" required></div>
          <div class="form-group"><label>Subtítulo</label><textarea id="homeHeroSub" rows="2"></textarea></div>
          <div class="form-group"><label>Texto del botón CTA</label><input type="text" id="homeHeroCta"></div>
          <div class="form-group"><label>Título productos destacados</label><input type="text" id="homeFeatured"></div>
          <button type="submit" class="btn btn-primary">Guardar inicio</button>
        </form>
      </section>
      <section id="sec-checkoutcfg" class="admin-section">
        <p style="color:var(--text-muted);margin-bottom:16px">Configura envíos y métodos de pago.</p>
        <form id="checkoutForm" style="max-width:560px;display:flex;flex-direction:column;gap:12px">
          <div class="form-group"><label>Envío estándar — etiqueta</label><input type="text" id="shipStdLabel"></div>
          <div class="form-group"><label>Envío estándar — días</label><input type="text" id="shipStdDays"></div>
          <div class="form-group"><label>Envío estándar — precio (0=gratis)</label><input type="number" id="shipStdPrice" min="0" step="0.01"></div>
          <div class="form-group"><label>Envío express — etiqueta</label><input type="text" id="shipExpLabel"></div>
          <div class="form-group"><label>Envío express — días</label><input type="text" id="shipExpDays"></div>
          <div class="form-group"><label>Envío express — precio</label><input type="number" id="shipExpPrice" min="0" step="0.01"></div>
          <div class="form-group"><label>Métodos de pago (coma)</label><input type="text" id="payMethods" placeholder="transferencia,efectivo"></div>
          <button type="submit" class="btn btn-primary">Guardar checkout</button>
        </form>
      </section>`
    );
  }
  async function loadHomeForm() {
    const { data } = await sb.from('site_settings').select('value').eq('key', 'home').maybeSingle();
    const v = data?.value || {};
    document.getElementById('homeHeroTitle').value = v.hero_title || 'Todo lo que necesitas, en un solo lugar';
    document.getElementById('homeHeroSub').value = v.hero_subtitle || '';
    document.getElementById('homeHeroCta').value = v.hero_cta || 'Ver ofertas';
    document.getElementById('homeFeatured').value = v.featured_title || 'Productos destacados';
  }
  async function loadCheckoutForm() {
    const { data } = await sb.from('site_settings').select('value').eq('key', 'checkout').maybeSingle();
    const v = data?.value || {};
    document.getElementById('shipStdLabel').value = v.shipping_standard_label || 'Envío estándar';
    document.getElementById('shipStdDays').value = v.shipping_standard_days || '3-5 días hábiles';
    document.getElementById('shipStdPrice').value = v.shipping_standard_price ?? 0;
    document.getElementById('shipExpLabel').value = v.shipping_express_label || 'Envío express';
    document.getElementById('shipExpDays').value = v.shipping_express_days || '1-2 días hábiles';
    document.getElementById('shipExpPrice').value = v.shipping_express_price ?? 0;
    document.getElementById('payMethods').value = (v.payment_methods || ['transferencia', 'efectivo']).join(',');
  }
  function wire() {
    ensureNav();
    ensureSections();
    document.querySelectorAll('.admin-nav a[data-section]').forEach((a) => {
      if (a._homeWired) return;
      a._homeWired = true;
      a.addEventListener('click', () => {
        setTimeout(() => {
          if (a.dataset.section === 'home') loadHomeForm();
          if (a.dataset.section === 'checkoutcfg') loadCheckoutForm();
        }, 50);
      });
    });
    document.getElementById('homeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = {
        hero_title: document.getElementById('homeHeroTitle').value.trim(),
        hero_subtitle: document.getElementById('homeHeroSub').value.trim(),
        hero_cta: document.getElementById('homeHeroCta').value.trim(),
        featured_title: document.getElementById('homeFeatured').value.trim(),
      };
      const { error } = await sb.from('site_settings').upsert({ key: 'home', value, updated_at: new Date().toISOString() });
      if (typeof toast === 'function') toast(error ? error.message : 'Inicio actualizado', error ? 'error' : 'success');
    });
    document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = {
        shipping_standard_label: document.getElementById('shipStdLabel').value.trim(),
        shipping_standard_days: document.getElementById('shipStdDays').value.trim(),
        shipping_standard_price: Number(document.getElementById('shipStdPrice').value) || 0,
        shipping_express_label: document.getElementById('shipExpLabel').value.trim(),
        shipping_express_days: document.getElementById('shipExpDays').value.trim(),
        shipping_express_price: Number(document.getElementById('shipExpPrice').value) || 0,
        payment_methods: document.getElementById('payMethods').value.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const { error } = await sb.from('site_settings').upsert({ key: 'checkout', value, updated_at: new Date().toISOString() });
      if (typeof toast === 'function') toast(error ? error.message : 'Checkout actualizado', error ? 'error' : 'success');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(wire, 200));
  else setTimeout(wire, 200);
})();
