/**
 * Cliente Supabase - MercadoPlus v0.1
 * 
 * En modo DEMO_MODE usa localStorage + datos mock.
 * Cuando configures SUPABASE_URL y SUPABASE_ANON_KEY reales y pongas DEMO_MODE = false,
 * todas las operaciones pasarán por Supabase.
 */

let supabase = null;

function initSupabase() {
  if (CONFIG.DEMO_MODE || CONFIG.SUPABASE_URL.includes('TU_PROYECTO')) {
    console.log('[MercadoPlus] Modo DEMO activo. Usando datos locales.');
    return null;
  }

  try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('[MercadoPlus] Supabase conectado correctamente.');
    return supabase;
  } catch (err) {
    console.error('[MercadoPlus] Error al inicializar Supabase:', err);
    return null;
  }
}

// Inicializar al cargar
const sb = initSupabase();
window.sb = sb;

/* ============================================================
   HELPERS DE DATOS (funcionan en DEMO y en Supabase real)
   ============================================================ */

const DataService = {
  // ---- PRODUCTOS ----
  async getProducts(filters = {}) {
    if (CONFIG.DEMO_MODE || !sb) {
      let products = [...MOCK_PRODUCTS];
      if (filters.category) {
        products = products.filter(p => p.category === filters.category);
      }
      if (filters.store_id) {
        products = products.filter(p => p.store_id === filters.store_id);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      // Sort
      if (filters.sort === 'precio-asc') products.sort((a, b) => a.price - b.price);
      else if (filters.sort === 'precio-desc') products.sort((a, b) => b.price - a.price);
      else if (filters.sort === 'nuevos') products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return products;
    }

    // Supabase real
    let query = sb.from('products').select('*, stores(name, logo)').eq('active', true);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.store_id) query = query.eq('store_id', filters.store_id);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.sort === 'precio-asc') query = query.order('price', { ascending: true });
    else if (filters.sort === 'precio-desc') query = query.order('price', { ascending: false });
    else if (filters.sort === 'nuevos') query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getProduct(id) {
    if (CONFIG.DEMO_MODE || !sb) {
      return MOCK_PRODUCTS.find(p => p.id === id) || null;
    }
    const { data, error } = await sb.from('products').select('*, stores(name, logo)').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // ---- TIENDAS ----
  async getStores() {
    if (CONFIG.DEMO_MODE || !sb) {
      return MOCK_STORES;
    }
    const { data, error } = await sb.from('stores').select('*').eq('active', true).order('name');
    if (error) throw error;
    return data || [];
  },

  async getStore(id) {
    if (CONFIG.DEMO_MODE || !sb) {
      return MOCK_STORES.find(s => s.id === id) || null;
    }
    const { data, error } = await sb.from('stores').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // ---- PEDIDOS ----
  async getOrders(userId) {
    if (CONFIG.DEMO_MODE || !sb) {
      const stored = localStorage.getItem('mp_orders');
      return stored ? JSON.parse(stored) : [];
    }
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*, products(name, image, price))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createOrder(orderData) {
    if (CONFIG.DEMO_MODE || !sb) {
      const orders = JSON.parse(localStorage.getItem('mp_orders') || '[]');
      const newOrder = {
        id: 'ord-' + Date.now(),
        ...orderData,
        status: 'pendiente',
        created_at: new Date().toISOString(),
      };
      orders.unshift(newOrder);
      localStorage.setItem('mp_orders', JSON.stringify(orders));

      // Simular notificación al vendedor
      const notifs = JSON.parse(localStorage.getItem('mp_notifications') || '[]');
      notifs.unshift({
        id: Date.now(),
        title: '¡Nuevo pedido recibido!',
        body: `Pedido #${newOrder.id.slice(-6)} por $${newOrder.total.toLocaleString()}`,
        time: 'Ahora',
        read: false,
        type: 'order',
        for_role: 'seller',
      });
      localStorage.setItem('mp_notifications', JSON.stringify(notifs));

      return newOrder;
    }

    // Supabase: insert order + items + trigger notificación
    const { data: order, error } = await sb.from('orders').insert({
      user_id: orderData.user_id,
      total: orderData.total,
      status: 'pendiente',
      shipping_address: orderData.shipping_address,
    }).select().single();
    if (error) throw error;

    const items = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      store_id: item.store_id,
    }));
    await sb.from('order_items').insert(items);

    // Notificación a vendedores (se puede hacer con Edge Function o trigger)
    return order;
  },

  // ---- PERFIL ----
  async getProfile(userId) {
    if (CONFIG.DEMO_MODE || !sb) {
      const stored = localStorage.getItem('mp_profile');
      return stored ? JSON.parse(stored) : null;
    }
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    if (CONFIG.DEMO_MODE || !sb) {
      const profile = { id: userId, ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('mp_profile', JSON.stringify(profile));
      return profile;
    }
    const { data, error } = await sb.from('profiles').upsert({ id: userId, ...updates }).select().single();
    if (error) throw error;
    return data;
  },

  // ---- SOLICITUD VENDEDOR ----
  async requestSeller(userId, data) {
    if (CONFIG.DEMO_MODE || !sb) {
      localStorage.setItem('mp_seller_request', JSON.stringify({
        user_id: userId,
        status: 'pendiente',
        ...data,
        created_at: new Date().toISOString(),
      }));
      return { status: 'pendiente' };
    }
    const { data: req, error } = await sb.from('seller_requests').insert({
      user_id: userId,
      status: 'pendiente',
      ...data,
    }).select().single();
    if (error) throw error;
    return req;
  },

  async getSellerRequest(userId) {
    if (CONFIG.DEMO_MODE || !sb) {
      const stored = localStorage.getItem('mp_seller_request');
      return stored ? JSON.parse(stored) : null;
    }
    const { data, error } = await sb.from('seller_requests').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },
};

window.DataService = DataService;
