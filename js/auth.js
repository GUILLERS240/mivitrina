/**
 * Mi Vitrina — Auth
 * Supabase Auth (email + Google) + fallback DEMO.
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
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      this.currentUser = await this._mapUser(session.user);
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
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    fullName = String(fullName || '').trim();
    if (!email || !password) throw new Error('Correo y contraseña son obligatorios.');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

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
        emailRedirectTo: window.location.origin,
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
      try {
        const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({ email, password });
        if (!loginErr && loginData?.user) {
          this.currentUser = await this._mapUser(loginData.user);
          return this.currentUser;
        }
        if (loginErr) {
          const m = (loginErr.message || '').toLowerCase();
          if (m.includes('confirm') || m.includes('verify') || m.includes('not confirmed')) {
            throw new Error('Cuenta creada. Debes verificar tu correo antes de entrar. Revisa tu bandeja.');
          }
        }
      } catch (e) {
        if (e.message && e.message.includes('verificar')) throw e;
      }
    }

    return data;
  },

  async login(email, password) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!email || !password) throw new Error('Escribe correo y contraseña.');

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

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      console.warn('[Auth.login]', error.message, error.status);
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('invalid login')) {
        throw new Error('Correo o contraseña incorrectos. Si acabas de registrarte, revisa tu correo o usa "Continuar con Google".');
      }
      if (msg.includes('confirm') || msg.includes('verify') || msg.includes('not confirmed')) {
        throw new Error('Debes verificar tu correo antes de entrar. Revisa tu bandeja (y spam).');
      }
      if (msg.includes('network') || msg.includes('fetch')) {
        throw new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
      }
      throw new Error(error.message || 'Error al iniciar sesión');
    }
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
    if (CONFIG.DEMO_MODE || !window.sb) {
      throw new Error('Google login no disponible en modo demo. Usa email/contraseña.');
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
      throw new Error(error.message || 'Error al conectar con Google. Revisa la configuración OAuth en Supabase.');
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
    if (!CONFIG.DEMO_MODE && window.sb) {
      await sb.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem('mp_user');
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
