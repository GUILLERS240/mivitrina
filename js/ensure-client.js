/* ensureClient — reintenta conectar Supabase (login PC/móvil) */
(function () {
  function _create() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    if (!window.CONFIG || CONFIG.DEMO_MODE || !CONFIG.SUPABASE_URL) return null;
    if (String(CONFIG.SUPABASE_URL).includes('TU_PROYECTO')) return null;
    try {
      const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          flowType: 'pkce',
        },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      window.sb = client;
      console.log('[Mi Vitrina] Supabase listo (ensureClient)');
      return client;
    } catch (e) {
      console.error('[ensureClient]', e);
      return null;
    }
  }

  window.ensureClient = async function ensureClient(timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    if (window.sb && window.sb.auth) return window.sb;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.sb && window.sb.auth) return window.sb;
      const c = _create();
      if (c) return c;
      await new Promise(function (r) { setTimeout(r, 120); });
    }
    return window.sb || _create();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!window.sb) _create();
    });
  } else if (!window.sb) {
    _create();
  }
})();
