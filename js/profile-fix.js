/**
 * Perfil en paneles desplegables + menú de accesos
 */
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function ensurePanels() {
    const container = qs('.profile-container');
    if (!container || container.dataset.panelsReady) return;
    container.dataset.panelsReady = '1';

    let hero = qs('.profile-hero', container);
    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'profile-hero';
      hero.innerHTML =
        '<div class="profile-avatar"><img id="profileAvatarHero" src="https://ui-avatars.com/api/?name=Usuario&background=0D8ABC&color=fff" alt=""></div>' +
        '<div class="profile-hero-info"><h2 id="profileHeroName">Usuario</h2><p id="profileHeroEmail">—</p></div>';
      container.insertBefore(hero, container.firstChild);
    }

    const formCard = qs('#profileForm')?.closest('.profile-card');
    const settingsCard = qs('#settingsCard');
    const sellerCard = qs('#sellerRequestStatus')?.closest('.profile-card');
    const referralCard = qs('#referralCodeBox')?.closest('.profile-card');
    const mobilePanels = qs('.mobile-only-block');

    function makePanel(id, title, icon, contentEl) {
      if (!contentEl) return null;
      let panel = document.getElementById(id);
      if (panel) return panel;
      panel = document.createElement('div');
      panel.id = id;
      panel.className = 'profile-panel hidden';
      panel.innerHTML =
        '<div class="profile-panel-head">' +
        '<button type="button" class="profile-panel-back" data-close-panel="' + id + '"><i class="fas fa-arrow-left"></i></button>' +
        '<h3><i class="fas ' + icon + '"></i> ' + title + '</h3></div>' +
        '<div class="profile-panel-body"></div>';
      contentEl.classList.remove('hidden');
      panel.querySelector('.profile-panel-body').appendChild(contentEl);
      contentEl.style.boxShadow = 'none';
      contentEl.style.border = 'none';
      contentEl.style.margin = '0';
      contentEl.style.padding = '0';
      container.appendChild(panel);
      return panel;
    }

    if (formCard) makePanel('panel-datos', 'Mis datos', 'fa-user', formCard);
    if (settingsCard) makePanel('panel-config', 'Configuración', 'fa-gear', settingsCard);
    if (sellerCard) makePanel('panel-vendedor', 'Ser vendedor', 'fa-store', sellerCard);
    if (referralCard) makePanel('panel-referidos', 'Gestores / Referidos', 'fa-handshake', referralCard);
    if (mobilePanels) makePanel('panel-paneles', 'Mis paneles', 'fa-table-columns', mobilePanels);

    const menuCard = qs('.profile-menu-card', container);
    if (menuCard) {
      menuCard.classList.add('profile-menu-sticky');
      const nav = qs('#profileMenuList', menuCard) || qs('.profile-menu-list', menuCard);
      if (nav) {
        nav.innerHTML =
          '<a href="#" data-open-panel="panel-datos"><i class="fas fa-user"></i> Mis datos <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-view="pedidos"><i class="fas fa-box"></i> Mis pedidos <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" id="menuWishlist"><i class="fas fa-heart"></i> Lista de deseos <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-open-panel="panel-datos" data-focus="profAddress"><i class="fas fa-location-dot"></i> Mis direcciones <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-open-panel="panel-vendedor"><i class="fas fa-store"></i> Vendedor <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-open-panel="panel-referidos"><i class="fas fa-handshake"></i> Gestores / Referidos <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-open-panel="panel-paneles" class="admin-seller-link"><i class="fas fa-table-columns"></i> Mis paneles <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-open-panel="panel-config"><i class="fas fa-gear"></i> Configuración <i class="fas fa-chevron-right chev"></i></a>' +
          '<a href="#" data-view="ayuda"><i class="fas fa-circle-question"></i> Centro de ayuda <i class="fas fa-chevron-right chev"></i></a>';
      }
    }

    qsa('.profile-panel', container).forEach(function (p) { p.classList.add('hidden'); });

    container.addEventListener('click', function (e) {
      const openBtn = e.target.closest('[data-open-panel]');
      if (openBtn) {
        e.preventDefault();
        openPanel(openBtn.getAttribute('data-open-panel'), openBtn.getAttribute('data-focus'));
        return;
      }
      const closeBtn = e.target.closest('[data-close-panel]');
      if (closeBtn) {
        e.preventDefault();
        closePanels();
        return;
      }
      const viewLink = e.target.closest('[data-view]');
      if (viewLink && viewLink.closest('#profileMenuList')) {
        e.preventDefault();
        const v = viewLink.getAttribute('data-view');
        if (typeof switchView === 'function') switchView(v);
      }
    });

    qs('#menuWishlist')?.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof openWishlist === 'function') openWishlist();
      else if (typeof toast === 'function') toast('Lista de deseos');
    });

    syncHero();
    wireThemeInConfig();
  }

  function openPanel(id, focusId) {
    const container = qs('.profile-container');
    if (!container) return;
    qsa('.profile-panel', container).forEach(function (p) { p.classList.add('hidden'); });
    const menu = qs('.profile-menu-card', container);
    if (menu) menu.classList.add('hidden');
    const panel = document.getElementById(id);
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusId) {
        setTimeout(function () {
          const el = document.getElementById(focusId);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      }
    }
  }

  function closePanels() {
    const container = qs('.profile-container');
    if (!container) return;
    qsa('.profile-panel', container).forEach(function (p) { p.classList.add('hidden'); });
    const menu = qs('.profile-menu-card', container);
    if (menu) menu.classList.remove('hidden');
    const hero = qs('.profile-hero', container);
    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function syncHero() {
    const u = typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser();
    if (!u) return;
    const n = document.getElementById('profileHeroName');
    const e = document.getElementById('profileHeroEmail');
    const av = document.getElementById('profileAvatarHero');
    if (n) n.textContent = u.name || 'Usuario';
    if (e) e.textContent = u.email || '';
    if (av && u.avatar) av.src = u.avatar;
  }

  function wireThemeInConfig() {
    const card = document.getElementById('settingsCard');
    if (!card) return;
    const old = card.querySelector('.theme-switcher');
    if (old) old.remove();
    qsa('.setting-item', card).forEach(function (row) {
      if (row.textContent.indexOf('oscuro') >= 0 || row.textContent.indexOf('Oscuro') >= 0) {
        row.style.display = 'none';
      }
    });
    let wrap = card.querySelector('.theme-switcher-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'theme-switcher-wrap';
      wrap.innerHTML =
        '<p class="profile-section-title">Apariencia</p>' +
        '<div class="theme-switcher">' +
        '<button type="button" class="theme-btn" data-theme="light"><i class="fas fa-sun"></i><span>Claro</span></button>' +
        '<button type="button" class="theme-btn" data-theme="dark"><i class="fas fa-moon"></i><span>Oscuro</span></button>' +
        '</div>';
      card.insertBefore(wrap, card.firstChild);
    }
    const current = localStorage.getItem('mp_theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current);
    qsa('.theme-btn', wrap).forEach(function (btn) {
      btn.onclick = function () {
        applyTheme(btn.dataset.theme);
        if (typeof toast === 'function') {
          toast(btn.dataset.theme === 'dark' ? 'Modo oscuro' : 'Modo claro', 'success');
        }
      };
    });
  }

  function applyTheme(mode) {
    const dark = mode === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
    localStorage.setItem('mp_theme', dark ? 'dark' : 'light');
    qsa('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === mode);
    });
  }

  function boot() {
    ensurePanels();
    syncHero();
  }

  const prev = window.onAuthChange;
  window.onAuthChange = function () {
    if (typeof prev === 'function') prev();
    setTimeout(function () {
      ensurePanels();
      syncHero();
    }, 100);
  };

  const _sw = window.switchView;
  if (typeof _sw === 'function') {
    window.switchView = function (v) {
      _sw(v);
      if (v === 'perfil') setTimeout(boot, 80);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
  } else {
    setTimeout(boot, 400);
  }

  window.openProfilePanel = openPanel;
  window.closeProfilePanels = closePanels;
})();
