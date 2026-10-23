/**
 * Mi Vitrina — Auth (móvil + escritorio)
 */
const Auth = {
  currentUser: null,

  async init() {
    if (CONFIG.DEMO_MODE || !window.sb) {
      try {
        const raw = localStorage.getItem('mp_user');
        if (raw) this.currentUser = JSON.parse(raw);
      } catch (_) {}
      return this.currentUser;
    }
    try {
      const hash = window.location.hash || '';
      if (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=email')) {
        const { data: { session: hashSession }, error: hashErr } = await sb.auth.getSession();
        if (hashErr) console.warn('[Auth.hash]', hashErr);
        if (hashSession?.user) {
          this.currentUser = await this._mapUser(hashSession.user);
          try {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch (_) {}
        }
      }
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        this.currentUser = await this._mapUser(session.user);
      }
    } catch (e) {
      console.warn('[Auth.init]', e);
    }
    sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this.currentUser = await this._mapUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
      }
      if (typeof window.onAuthChange === 'function') window.onAuthChange();
    });
    return this.currentUser;
  },

  _cleanEmail(email) {
    return String(email || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
      .toLowerCase();
  },

  _cleanPassword(password) {
    return String(password || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r\n/g, '')
      .replace(/^\s+|\s+$/g, '');
  },

  async _mapUser(supabaseUser) {
    let profile = null;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
      profile = data;
    } catch (_) {}
    const name = profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario';
    let role = profile?.role || 'customer';
    if (supabaseUser.email?.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
      role = 'admin';
    }
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name,
      phone: profile?.phone || '',
      address: profile?.address || '',
      age: profile?.age || null,
      notes: profile?.notes || '',
      avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
      role,
      referral_code: profile?.referral_code || null,
      email_verified: supabaseUser.email_confirmed_at != null,
    };
  },

  async register(email, password, fullName) {
    email = this._cleanEmail(email);
    password = this._cleanPassword(password);
    fullName = String(fullName || '').trim();
    if (!email || !password) throw new Error('Correo y contraseña son obligatorios.');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

    if (!window.sb && typeof ensureClient === 'function' && !CONFIG.DEMO_MODE) {
      await ensureClient(8000);
    }

    if (CONFIG.DEMO_MODE || !window.sb) {
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      if (users.find(u => String(u.email).toLowerCase() === email)) {
        throw new Error('Este correo ya está registrado.');
      }
      const user = {
        id: 'user-' + Date.now(),
        email,
        password,
        name: fullName,
        phone: '',
        address: '',
        age: null,
        notes: '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`,
        role: email === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
        email_verified: true,
      };
      users.push(user);
      localStorage.setItem('mp_users', JSON.stringify(users));
      const { password: _, ...safeUser } = user;
      this.currentUser = safeUser;
      localStorage.setItem('mp_user', JSON.stringify(safeUser));
      return safeUser;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: (window.location.origin || '').replace(/\/$/, '') + '/',
      },
    });
    if (error) {
      const msg = error.message || 'Error al registrarse';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
      }
      throw new Error(msg);
    }

    if (data.user) {
      const role = email === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';
      try {
        await sb.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email,
          role,
        });
      } catch (e) {
        console.warn('Perfil:', e);
      }
      if (data.session) {
        this.currentUser = await this._mapUser(data.user);
        return this.currentUser;
      }
      const err = new Error(
        'Cuenta creada. Te enviamos un correo de verificación a ' + email +
        '. Ábrelo (también revisa spam) y luego inicia sesión.'
      );
      err.code = 'EMAIL_CONFIRM_REQUIRED';
      err.email = email;
      throw err;
    }
    return data;
  },

  async resendVerification(email) {
    email = this._cleanEmail(email);
    if (!email) throw new Error('Escribe tu correo.');
    if (!window.sb) throw new Error('Sin conexión al servidor.');
    const { error } = await sb.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: (window.location.origin || '').replace(/\/$/, '') + '/' },
    });
    if (error) throw new Error(error.message || 'No se pudo reenviar el correo.');
    return true;
  },

  async login(email, password) {
    email = this._cleanEmail(email);
    password = this._cleanPassword(password);
    if (!email || !password) throw new Error('Escribe correo y contraseña.');

    if (!window.sb && typeof ensureClient === 'function' && !CONFIG.DEMO_MODE) {
      await ensureClient(8000);
    }
    if (!window.sb && !CONFIG.DEMO_MODE) {
      throw new Error('No hay conexión con el servidor. Recarga la página (Ctrl+F5).');
    }

    if (CONFIG.DEMO_MODE || !window.sb) {
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      const user = users.find(u => String(u.email).toLowerCase() === email && u.password === password);
      if (!user) throw new Error('Correo o contraseña incorrectos.');
      const { password: _, ...safeUser } = user;
      if (email === CONFIG.ADMIN_EMAIL.toLowerCase()) safeUser.role = 'admin';
      this.currentUser = safeUser;
      localStorage.setItem('mp_user', JSON.stringify(safeUser));
      return safeUser;
    }

    let data, error;
    try {
      const res = await sb.auth.signInWithPassword({ email, password });
      data = res.data;
      error = res.error;
    } catch (netErr) {
      console.warn('[Auth.login network]', netErr);
      throw new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
    }

    if (error) {
      const msg = (error.message || '').toLowerCase();
      console.warn('[Auth.login]', error.message, error.status, error.code);
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('invalid login')) {
        throw new Error('Correo o contraseña incorrectos. Escribe el correo sin espacios y revisa mayúsculas en la contraseña.');
      }
      if (msg.includes('confirm') || msg.includes('verify') || msg.includes('not confirmed')) {
        throw new Error('Debes verificar tu correo antes de entrar. Revisa tu bandeja (y spam).');
      }
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed')) {
        throw new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
      }
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    if (!data?.user) throw new Error('No se pudo iniciar sesión. Inténtalo de nuevo.');

    this.currentUser = await this._mapUser(data.user);
    if (email === CONFIG.ADMIN_EMAIL.toLowerCase()) {
      this.currentUser.role = 'admin';
      try {
        await sb.from('profiles').upsert({
          id: data.user.id,
          email,
          role: 'admin',
          full_name: this.currentUser.name,
        });
      } catch (_) {}
    }
    return this.currentUser;
  },

  async loginWithGoogle() {
    if (!window.sb && typeof ensureClient === 'function' && !CONFIG.DEMO_MODE) {
      await ensureClient(5000);
    }
    if (CONFIG.DEMO_MODE || !window.sb) {
      throw new Error('Google login no disponible. Usa email/contraseña.');
    }
    const redirectTo = (window.location.origin || '').replace(/\/$/, '') + '/';
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) {
      console.warn('[Auth.google]', error);
      throw new Error(error.message || 'Error al conectar con Google.');
    }
    return data;
  },

  async updateProfile(updates) {
    if (!this.currentUser) throw new Error('No hay sesión');
    if (CONFIG.DEMO_MODE || !window.sb) {
      Object.assign(this.currentUser, updates);
      localStorage.setItem('mp_user', JSON.stringify(this.currentUser));
      return this.currentUser;
    }
    const payload = {};
    if (updates.name != null) payload.full_name = updates.name;
    if (updates.phone != null) payload.phone = updates.phone;
    if (updates.address != null) payload.address = updates.address;
    if (updates.age != null) payload.age = updates.age ? Number(updates.age) : null;
    if (updates.notes != null) payload.notes = updates.notes;
    if (updates.avatar != null) payload.avatar_url = updates.avatar;
    const { error } = await sb.from('profiles').upsert({ id: this.currentUser.id, ...payload });
    if (error) throw new Error(error.message);
    Object.assign(this.currentUser, updates);
    return this.currentUser;
  },

  async logout() {
    this.currentUser = null;
    try { localStorage.removeItem('mp_user'); } catch (_) {}
    if (!CONFIG.DEMO_MODE && window.sb) {
      try {
        await sb.auth.signOut({ scope: 'global' });
      } catch (_) {
        try { await sb.auth.signOut(); } catch (__) {}
      }
    }
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') || k.indexOf('supabase') >= 0) {
          localStorage.removeItem(k);
        }
      });
    } catch (_) {}
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('sb-') || k.indexOf('supabase') >= 0) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (_) {}
  },

  isLoggedIn() { return !!this.currentUser; },
  getUser() { return this.currentUser; },
  isAdmin() {
    return this.currentUser?.role === 'admin' ||
      this.currentUser?.email?.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase();
  },
  isSeller() { return this.currentUser?.role === 'seller' || this.isAdmin(); },
  isManager() { return this.currentUser?.role === 'manager' || this.isAdmin(); },
};

window.Auth = Auth;
