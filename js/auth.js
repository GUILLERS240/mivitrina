/**
 * Autenticación - MercadoPlus v0.1
 * Soporta modo DEMO (localStorage) y Supabase Auth real.
 */

const Auth = {
  currentUser: null,

  async init() {
    if (CONFIG.DEMO_MODE || !window.sb) {
      const stored = localStorage.getItem('mp_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
      return this.currentUser;
    }

    // Supabase real
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      this.currentUser = await this._mapUser(session.user);
    }

    // Escuchar cambios de sesión
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
    const profile = await DataService.getProfile(supabaseUser.id);
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      phone: profile?.phone || '',
      address: profile?.address || '',
      age: profile?.age || null,
      notes: profile?.notes || '',
      avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=0D8ABC&color=fff`,
      role: profile?.role || 'customer', // customer | seller | admin
      email_verified: supabaseUser.email_confirmed_at != null,
    };
  },

  async register(email, password, fullName) {
    if (CONFIG.DEMO_MODE || !window.sb) {
      // Demo: crear usuario local
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      if (users.find(u => u.email === email)) {
        throw new Error('Este correo ya está registrado.');
      }
      const user = {
        id: 'user-' + Date.now(),
        email,
        password, // solo en demo
        name: fullName,
        phone: '',
        address: '',
        age: null,
        notes: '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`,
        role: email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer',
        email_verified: true, // en demo se verifica automáticamente
      };
      users.push(user);
      localStorage.setItem('mp_users', JSON.stringify(users));
      // Auto login
      const { password: _, ...safeUser } = user;
      this.currentUser = safeUser;
      localStorage.setItem('mp_user', JSON.stringify(safeUser));
      return safeUser;
    }

    // Supabase real
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    // Crear perfil
    if (data.user) {
      const role = email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';
      await sb.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      });
    }

    return data;
  },

  async login(email, password) {
    if (CONFIG.DEMO_MODE || !window.sb) {
      const users = JSON.parse(localStorage.getItem('mp_users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) throw new Error('Correo o contraseña incorrectos.');
      const { password: _, ...safeUser } = user;
      // Si es el admin email, forzar role admin
      if (email.toLowerCase() === CONFIG.ADMIN_EMAIL.toLowerCase()) {
        safeUser.role = 'admin';
      }
      this.currentUser = safeUser;
      localStorage.setItem('mp_user', JSON.stringify(safeUser));
      return safeUser;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.currentUser = await this._mapUser(data.user);
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
