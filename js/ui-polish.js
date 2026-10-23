/**
 * Mi Vitrina UI polish — toast, perfil, tema, checkout, referidos, sin alert nativo
 */
(function () {
  let audioCtx = null;
  function playNotifSound() {
    try {
      if (localStorage.getItem('mp_sound') === 'off') return;
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.value = 880;
      o.type = 'sine';
      g.gain.setValueAtTime(0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      o.start();
      o.stop(audioCtx.currentTime + 0.25);
    } catch (_) {}
  }
  window.playNotifSound = playNotifSound;

  function ensureToastContainer() {
    let c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toastContainer';
      document.body.appendChild(c);
    }
    return c;
  }

  window.toast = function (msg, type) {
    const c = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = String(msg || '');
    c.appendChild(el);
    playNotifSound();
    setTimeout(function () {
      el.classList.add('hiding');
      setTimeout(function () { try { el.remove(); } catch (_) {} }, 320);
    }, 3200);
  };

  window.alert = function (msg) { toast(String(msg), 'error'); };
  window.confirm = function (msg) { toast(String(msg)); return true; };

  function applyTheme(mode) {
    const dark = mode === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
    localStorage.setItem('mp_theme', dark ? 'dark' : 'light');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === mode);
    });
    const legacy = document.getElementById('darkModeToggle');
    if (legacy) legacy.checked = dark;
  }

  function wireThemeButtons() {
    const card = document.getElementById('settingsCard');
    if (!card || card.querySelector('.theme-switcher')) return;
    const row = card.querySelector('.setting-item');
    if (row && row.textContent.indexOf('oscuro') >= 0) row.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<p class="profile-section-title" style="margin-top:0">Apariencia</p>' +
      '<div class="theme-switcher">' +
      '<button type="button" class="theme-btn" data-theme="light"><i class="fas fa-sun"></i> Claro</button>' +
      '<button type="button" class="theme-btn" data-theme="dark"><i class="fas fa-moon"></i> Oscuro</button>' +
      '</div>';
    card.insertBefore(wrap, card.children[1] || null);
    const current = localStorage.getItem('mp_theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current);
    card.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.dataset.theme);
        toast(btn.dataset.theme === 'dark' ? 'Modo oscuro' : 'Modo claro', 'success');
      });
    });
  }

  function polishProfile() {
    const view = document.getElementById('view-perfil');
    if (!view || view._polished) return;
    view._polished = true;
    const container = view.querySelector('.profile-container');
    if (!container) return;

    let hero = container.querySelector('.profile-hero');
    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'profile-hero';
      hero.innerHTML =
        '<div class="profile-avatar"><img id="profileAvatarHero" src="https://ui-avatars.com/api/?name=Usuario&background=0D8ABC&color=fff" alt=""><button class="btn-icon" id="changeAvatarHero" type="button"><i class="fas fa-camera"></i></button></div>' +
        '<div class="profile-hero-info"><h2 id="profileHeroName">Usuario</h2><p id="profileHeroEmail">—</p></div>';
      container.insertBefore(hero, container.firstChild);
      const oldAv = document.getElementById('profileAvatar');
      const heroAv = document.getElementById('profileAvatarHero');
      if (oldAv && heroAv) {
        const sync = function () { heroAv.src = oldAv.src; };
        sync();
        new MutationObserver(sync).observe(oldAv, { attributes: true, attributeFilter: ['src'] });
      }
      document.getElementById('changeAvatarHero')?.addEventListener('click', function () {
        document.getElementById('changeAvatar')?.click();
      });
    }

    const menuCard = container.querySelector('.profile-menu-card');
    if (menuCard && !menuCard.querySelector('.profile-section-title')) {
      const t = document.createElement('p');
      t.className = 'profile-section-title';
      t.textContent = 'Accesos rápidos';
      menuCard.insertBefore(t, menuCard.firstChild);
    }

    const refBox = document.getElementById('referralCodeBox');
    if (refBox && !refBox.dataset.enhanced) {
      refBox.dataset.enhanced = '1';
      enhanceReferral(refBox);
    }
  }

  function enhanceReferral(el) {
    function render() {
      const u = typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser();
      if (!u) {
        el.innerHTML = '<p style="margin:0;color:var(--text-muted)">Inicia sesión para ver tu código de referido.</p>';
        return;
      }
      let code = u.referral_code;
      if (!code && window.sb) {
        code = 'MV' + String(u.id).replace(/-/g, '').slice(0, 8).toUpperCase();
        sb.from('profiles').update({ referral_code: code }).eq('id', u.id).then(function () {
          u.referral_code = code;
        }).catch(function () {});
      }
      code = code || 'MVUSER';
      const link = location.origin + '/?ref=' + encodeURIComponent(code);
      el.innerHTML =
        '<div class="referral-box">' +
        '<div>Tu código: <code id="refCodeVal">' + code + '</code></div>' +
        '<div class="ref-actions">' +
        '<button type="button" id="btnCopyRef"><i class="fas fa-copy"></i> Copiar código</button>' +
        '<button type="button" id="btnCopyRefLink"><i class="fas fa-link"></i> Copiar enlace</button>' +
        '<button type="button" id="btnShareRef"><i class="fas fa-share-nodes"></i> Compartir</button>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:var(--text-muted);margin:10px 0 0">Comparte el enlace al vender productos (gestores).</p>' +
        '</div>';
      document.getElementById('btnCopyRef')?.addEventListener('click', function () {
        navigator.clipboard?.writeText(code).then(function () { toast('Código copiado', 'success'); });
      });
      document.getElementById('btnCopyRefLink')?.addEventListener('click', function () {
        navigator.clipboard?.writeText(link).then(function () { toast('Enlace de referido copiado', 'success'); });
      });
      document.getElementById('btnShareRef')?.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({ title: 'Mi Vitrina', text: 'Compra en Mi Vitrina', url: link }).catch(function () {});
        } else {
          navigator.clipboard?.writeText(link).then(function () { toast('Enlace copiado', 'success'); });
        }
      });
    }
    render();
    const prev = window.onAuthChange;
    window.onAuthChange = function () {
      if (typeof prev === 'function') prev();
      render();
      updateProfileHero();
    };
  }

  function updateProfileHero() {
    const u = typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser();
    const n = document.getElementById('profileHeroName');
    const e = document.getElementById('profileHeroEmail');
    if (u) {
      if (n) n.textContent = u.name || 'Usuario';
      if (e) e.textContent = u.email || '';
    }
  }

  (function captureRef() {
    try {
      const p = new URLSearchParams(location.search);
      const ref = p.get('ref');
      if (ref) localStorage.setItem('mp_ref', ref);
    } catch (_) {}
  })();

  function polishCheckoutDOM() {
    const body = document.getElementById('checkoutBody');
    if (!body || body.classList.contains('checkout-modern')) return;
    body.classList.add('checkout-modern');
  }
  const _openCheckout = window.openCheckout;
  if (typeof _openCheckout === 'function') {
    window.openCheckout = function () {
      _openCheckout.apply(this, arguments);
      setTimeout(polishCheckoutDOM, 50);
    };
  }

  document.getElementById('profileGoAdmin')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) {
      location.href = 'admin.html';
    } else {
      toast('Solo el administrador puede entrar al panel', 'error');
    }
  });

  function boot() {
    ensureToastContainer();
    polishProfile();
    wireThemeButtons();
    updateProfileHero();
    const _sw = window.switchView;
    if (typeof _sw === 'function' && !_sw._polish) {
      window.switchView = function (v) {
        _sw(v);
        if (v === 'perfil') {
          setTimeout(function () {
            polishProfile();
            wireThemeButtons();
            updateProfileHero();
          }, 40);
        }
      };
      window.switchView._polish = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 300); });
  } else {
    setTimeout(boot, 300);
  }
})();
