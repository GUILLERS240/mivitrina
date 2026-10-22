/**
 * Autenticación - Mi Vitrina
 * Supabase Auth real + fallback DEMO.
 */

const Auth = {
  currentUser: null,

  async init() {
    if (CONFIG.DEMO_MODE || !window.sb) {
      const stored = localStorage.getItem('mp_user');
      if (stored) this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      this.currentUser = await this._mapUser(session.user);
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        this.currentUser = await this._mapUser(session.user);
      } else {
        this.currentUser = null;
      }
      if (typeof window.onAuthChange === 'function') {
        window.onAuthChange(this.currentUser);
      }
    });

    return this.currentUser;
  },

  async _mapUser(supabaseUser) {
    let profile = null;
    try {
      profile = await DataService.getProfile(supabaseUser.id);
    } catch (_) {}
    const name = profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0];
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
      email_verified: supabaseUser.email_confirmed_at != null,
    };
  },

  async register(email, password, fullName) {
    if (CONFIG.DEMO_MODE || !window.sb) {
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      if (users.find(u => u.email === email)) {
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
        role: email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
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
      const role = email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';
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
      }
    }

    return data;
  },

  async login(email, password) {
    if (CONFIG.DEMO_MODE || !window.sb) {
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) throw new Error('Correo o contraseña incorrectos.');
      const { password: _, ...safeUser } = user;
      if (email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) safeUser.role = 'admin';
      this.currentUser = safeUser;
      localStorage.setItem('mp_user', JSON.stringify(safeUser));
      return safeUser;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message || 'Error al iniciar sesión';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verify')) {
        throw new Error('Debes verificar tu correo antes de entrar. Revisa tu bandeja.');
      }
      throw new Error(msg);
    }
    this.currentUser = await this._mapUser(data.user);
    if (email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
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

  async updateProfile(updates) {
    if (!this.currentUser) throw new Error('No hay sesión');
    const payload = {
      full_name: updates.name ?? this.currentUser.name,
      phone: updates.phone ?? this.currentUser.phone,
      age: updates.age ? Number(updates.age) : this.currentUser.age,
      address: updates.address ?? this.currentUser.address,
      notes: updates.notes ?? this.currentUser.notes,
    };
    if (CONFIG.DEMO_MODE || !window.sb) {
      Object.assign(this.currentUser, {
        name: payload.full_name,
        phone: payload.phone,
        age: payload.age,
        address: payload.address,
        notes: payload.notes,
      });
      localStorage.setItem('mp_user', JSON.stringify(this.currentUser));
      return this.currentUser;
    }
    await DataService.updateProfile(this.currentUser.id, payload);
    this.currentUser = {
      ...this.currentUser,
      name: payload.full_name,
      phone: payload.phone,
      age: payload.age,
      address: payload.address,
      notes: payload.notes,
    };
    return this.currentUser;
  },

  async logout() {
    if (CONFIG.DEMO_MODE || !window.sb) {
      this.currentUser = null;
      localStorage.removeItem('mp_user');
      return;
    }
    await sb.auth.signOut();
    this.currentUser = null;
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isAdmin() {
    return this.currentUser?.role === 'admin' ||
      this.currentUser?.email?.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase();
  },

  isSeller() {
    return this.currentUser?.role === 'seller' || this.isAdmin();
  },

  getUser() {
    return this.currentUser;
  },
};

window.Auth = Auth;
