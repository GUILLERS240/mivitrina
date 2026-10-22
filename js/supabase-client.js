/**
 * Cliente Supabase - Mi Vitrina (100% real, sin demo)
 */
let supabase = null;

function initSupabase() {
  if (CONFIG.DEMO_MODE || !CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes('TU_PROYECTO')) {
    console.warn('[Mi Vitrina] DEMO_MODE o URL inválida');
    return null;
  }
  try {
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });
    console.log('[Mi Vitrina] Supabase conectado');
    return supabase;
  } catch (err) {
    console.error('[Mi Vitrina] Error Supabase:', err);
    return null;
  }
}

const sb = initSupabase();
window.sb = sb;

const DataService = {
  async uploadImage(file, folder = 'products') {
    if (!sb) throw new Error('Sin conexión a Supabase');
    if (!file || !file.type.startsWith('image/')) throw new Error('Selecciona una imagen válida');
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no puede superar 5 MB');

    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión');

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await sb.storage.from('store-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error(error.message || 'Error al subir imagen');

    const { data } = sb.storage.from('store-images').getPublicUrl(path);
    return data.publicUrl;
  },

  async getProducts(filters = {}) {
    if (!sb) return [];
    let query = sb.from('products').select('*, stores(name, logo, slug)').eq('active', true);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.store_id) query = query.eq('store_id', filters.store_id);
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    if (filters.sort === 'precio-asc') query = query.order('price', { ascending: true });
    else if (filters.sort === 'precio-desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) { console.error(error); throw error; }
    return data || [];
  },

  async getProduct(id) {
    if (!sb) return null;
    const { data, error } = await sb.from('products').select('*, stores(name, logo, slug)').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createProduct(payload) {
    if (!sb) throw new Error('Sin Supabase');
    const { data, error } = await sb.from('products').insert(payload).select('*, stores(name, logo)').single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id, payload) {
    if (!sb) throw new Error('Sin Supabase');
    const { data, error } = await sb.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    if (!sb) throw new Error('Sin Supabase');
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async getStores() {
    if (!sb) return [];
    const { data, error } = await sb.from('stores').select('*').eq('active', true).order('name');
    if (error) throw error;
    return data || [];
  },

  async getStore(id) {
    if (!sb) return null;
    const { data, error } = await sb.from('stores').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getStoreBySlug(slug) {
    if (!sb) return null;
    const { data, error } = await sb.from('stores').select('*').eq('slug', slug).eq('active', true).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getOrders(userId) {
    if (!sb) return [];
    const { data, error } = await sb
      .from('orders')
      .select('*, order_items(*, products(name, image, price))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(o => ({
      ...o,
      items: (o.order_items || []).map(it => ({
        ...it,
        name: it.products?.name || 'Producto',
        image: it.products?.image,
        price: it.unit_price,
      })),
    }));
  },

  async createOrder(orderData) {
    if (!sb) throw new Error('Sin Supabase');
    const storeId = orderData.items?.[0]?.store_id || null;
    const { data: order, error } = await sb.from('orders').insert({
      user_id: orderData.user_id,
      total: orderData.total,
      status: 'pendiente',
      shipping_address: orderData.shipping_address,
      store_id: storeId,
      payment_method: orderData.payment_method || 'transferencia',
      payment_status: 'pendiente',
      payer_name: orderData.payer_name || null,
      payer_phone: orderData.payer_phone || null,
    }).select().single();
    if (error) throw error;

    const items = orderData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      store_id: item.store_id,
    }));
    const { error: itemsErr } = await sb.from('order_items').insert(items);
    if (itemsErr) throw itemsErr;

    if (storeId) {
      const { data: store } = await sb.from('stores').select('owner_id').eq('id', storeId).single();
      if (store?.owner_id) {
        await sb.from('notifications').insert({
          user_id: store.owner_id,
          title: '¡Nuevo pedido!',
          body: `Pedido #${String(order.id).slice(-6)} por $${Number(order.total).toLocaleString()}`,
          type: 'order',
          data: { order_id: order.id },
        });
      }
    }
    return order;
  },

  async getProfile(userId) {
    if (!sb) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    if (!sb) throw new Error('Sin Supabase');
    const { data, error } = await sb.from('profiles').upsert({ id: userId, ...updates, updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data;
  },

  async requestSeller(userId, data) {
    if (!sb) throw new Error('Sin Supabase');
    const { data: req, error } = await sb.from('seller_requests').upsert({
      user_id: userId,
      status: 'pendiente',
      ...data,
    }, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    return req;
  },

  async getSellerRequest(userId) {
    if (!sb) return null;
    const { data, error } = await sb.from('seller_requests').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getConversations(userId) {
    if (!sb) return [];
    const { data: asUser } = await sb.from('conversations')
      .select('*, stores(name, logo), messages(content, created_at, read, sender_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return asUser || [];
  },

  async getOrCreateConversation(userId, storeId) {
    if (!sb) throw new Error('Sin Supabase');
    const { data: existing } = await sb.from('conversations')
      .select('*').eq('user_id', userId).eq('store_id', storeId).maybeSingle();
    if (existing) return existing;
    const { data, error } = await sb.from('conversations')
      .insert({ user_id: userId, store_id: storeId }).select().single();
    if (error) throw error;
    return data;
  },

  async getMessages(conversationId) {
    if (!sb) return [];
    const { data, error } = await sb.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendMessage(conversationId, senderId, content) {
    if (!sb) throw new Error('Sin Supabase');
    const { data, error } = await sb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteMessage(messageId) {
    if (!sb) throw new Error('Sin Supabase');
    const { error } = await sb.from('messages').delete().eq('id', messageId);
    if (error) throw error;
  },

  async deleteConversationMessages(conversationId) {
    if (!sb) throw new Error('Sin Supabase');
    const { error } = await sb.from('messages').delete().eq('conversation_id', conversationId);
    if (error) throw error;
  },

  subscribeMessages(conversationId, onMessage) {
    if (!sb) return null;
    return sb.channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => onMessage(payload.new))
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => onMessage({ deleted: true, id: payload.old?.id }))
      .subscribe();
  },

  async getNotifications(userId) {
    if (!sb) return [];
    const { data, error } = await sb.from('notifications')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  },

  async markNotificationRead(id) {
    if (!sb) return;
    await sb.from('notifications').update({ read: true }).eq('id', id);
  },

  async savePushSubscription(userId, sub) {
    if (!sb || !sub) return;
    const json = typeof sub.toJSON === 'function' ? sub.toJSON() : sub;
    await sb.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh || null,
      auth: json.keys?.auth || null,
    }, { onConflict: 'user_id,endpoint' });
  },
};

window.DataService = DataService;
