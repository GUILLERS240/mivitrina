/* Login fiable + carga módulos UI */
(function () {
  function showLoginError(msg) {
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    if (typeof toast === 'function') toast(msg, 'error');
  }

  async function doLogin(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('btnLoginSubmit') || form?.querySelector('button[type="submit"]');
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }

    await new Promise((r) => setTimeout(r, 40));

    let email = (emailEl?.value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
    let password = (passEl?.value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/^\s+|\s+$/g, '');

    if (!email || !password) {
      showLoginError('Escribe correo y contraseña.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Conectando...';
    }

    try {
      if (typeof ensureClient === 'function') {
        const client = await ensureClient(8000);
        if (!client && !(window.CONFIG && CONFIG.DEMO_MODE)) {
          showLoginError('No se pudo conectar con el servidor. Revisa tu internet y recarga.');
          return;
        }
      } else if (!window.sb && !(window.CONFIG && CONFIG.DEMO_MODE)) {
        showLoginError('Sin conexión al servidor. Recarga la página.');
        return;
      }

      if (btn) btn.textContent = 'Entrando...';
      await Auth.login(email, password);
      if (typeof closeAuthModal === 'function') closeAuthModal();
      if (typeof updateAuthUI === 'function') updateAuthUI();
      if (typeof toast === 'function') toast('Bienvenido', 'success');
      if (typeof window.onAuthChange === 'function') window.onAuthChange();
    } catch (err) {
      console.warn('[login-fix]', err);
      showLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    }
  }

  function wire() {
    const form = document.getElementById('loginForm');
    if (!form || form._loginFixed) return;
    form._loginFixed = true;
    form.addEventListener('submit', doLogin, true);
    const btn = document.getElementById('btnLoginSubmit');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        doLogin(e);
      }, true);
    }
    document.getElementById('btnGoogleLogin')?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (typeof ensureClient === 'function') await ensureClient(5000);
        await Auth.loginWithGoogle();
      } catch (err) {
        showLoginError(err.message || 'Error con Google');
      }
    });
  }

  function addCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function addJs(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  }

  function loadExtras() {
    addCss('/css/social.css');
    addCss('/css/ui-polish.css');
    addCss('/css/profile-fix.css');
    addCss('/css/cards-fix.css');
    addJs('/js/social-features.js');
    addJs('/js/ui-polish.js');
    addJs('/js/profile-fix.js');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(wire, 50);
      loadExtras();
    });
  } else {
    setTimeout(wire, 50);
    loadExtras();
  }
  window.addEventListener('load', function () { setTimeout(wire, 100); });
})();
