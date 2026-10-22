/**
 * Datos de demostración (v0.1)
 * Cuando conectes Supabase estos datos se reemplazan por las consultas reales.
 */

const MOCK_STORES = [
  {
    id: 'store-1',
    name: 'TechZone',
    description: 'Electrónica y gadgets de última generación',
    logo: 'https://ui-avatars.com/api/?name=TZ&background=146eb4&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-1',
    products_count: 8,
    rating: 4.7,
    created_at: '2025-01-15'
  },
  {
    id: 'store-2',
    name: 'Moda Urbana',
    description: 'Ropa y accesorios con estilo',
    logo: 'https://ui-avatars.com/api/?name=MU&background=e91e63&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-2',
    products_count: 12,
    rating: 4.5,
    created_at: '2025-02-01'
  },
  {
    id: 'store-3',
    name: 'Casa & Hogar',
    description: 'Todo para tu hogar al mejor precio',
    logo: 'https://ui-avatars.com/api/?name=CH&background=4caf50&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-3',
    products_count: 6,
    rating: 4.8,
    created_at: '2025-03-10'
  },
  {
    id: 'store-4',
    name: 'SportMax',
    description: 'Equipamiento deportivo profesional',
    logo: 'https://ui-avatars.com/api/?name=SM&background=ff5722&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-4',
    products_count: 9,
    rating: 4.6,
    created_at: '2025-04-05'
  },
  {
    id: 'store-5',
    name: 'Belleza Natural',
    description: 'Cosméticos y cuidado personal',
    logo: 'https://ui-avatars.com/api/?name=BN&background=9c27b0&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-5',
    products_count: 7,
    rating: 4.9,
    created_at: '2025-05-20'
  },
  {
    id: 'store-6',
    name: 'GamerHub',
    description: 'Todo para gamers: consolas, PC y accesorios',
    logo: 'https://ui-avatars.com/api/?name=GH&background=673ab7&color=fff&size=128',
    banner: null,
    owner_id: 'user-seller-6',
    products_count: 10,
    rating: 4.7,
    created_at: '2025-06-12'
  }
];

const MOCK_PRODUCTS = [
  // TechZone
  { id: 'p1', store_id: 'store-1', name: 'Auriculares Bluetooth Pro', description: 'Auriculares inalámbricos con cancelación de ruido activa, 30h de batería y micrófono integrado.', price: 129900, old_price: 159900, category: 'electronica', image: 'https://picsum.photos/seed/p1/400/400', stock: 25, created_at: '2025-08-01' },
  { id: 'p2', store_id: 'store-1', name: 'Smartwatch Fitness X2', description: 'Reloj inteligente con monitor de ritmo cardíaco, GPS y resistencia al agua 5ATM.', price: 249900, old_price: null, category: 'electronica', image: 'https://picsum.photos/seed/p2/400/400', stock: 15, created_at: '2025-08-05' },
  { id: 'p3', store_id: 'store-1', name: 'Cargador Inalámbrico 15W', description: 'Carga rápida compatible con iPhone y Android. Diseño minimalista.', price: 49900, old_price: 69900, category: 'electronica', image: 'https://picsum.photos/seed/p3/400/400', stock: 40, created_at: '2025-08-10' },
  { id: 'p4', store_id: 'store-1', name: 'Parlante Bluetooth Portátil', description: 'Sonido 360°, resistente al agua IPX7, 12h de reproducción.', price: 89900, old_price: null, category: 'electronica', image: 'https://picsum.photos/seed/p4/400/400', stock: 30, created_at: '2025-08-12' },

  // Moda Urbana
  { id: 'p5', store_id: 'store-2', name: 'Camiseta Oversize Premium', description: '100% algodón orgánico, corte oversized, disponible en 5 colores.', price: 59900, old_price: 79900, category: 'ropa', image: 'https://picsum.photos/seed/p5/400/400', stock: 50, created_at: '2025-08-02' },
  { id: 'p6', store_id: 'store-2', name: 'Jean Slim Fit Negro', description: 'Denim elástico de alta calidad, tiro medio, ajuste perfecto.', price: 119900, old_price: null, category: 'ropa', image: 'https://picsum.photos/seed/p6/400/400', stock: 20, created_at: '2025-08-08' },
  { id: 'p7', store_id: 'store-2', name: 'Zapatillas Urbanas Runner', description: 'Suela de goma antideslizante, plantilla acolchada, ultra ligeras.', price: 189900, old_price: 229900, category: 'ropa', image: 'https://picsum.photos/seed/p7/400/400', stock: 18, created_at: '2025-08-15' },
  { id: 'p8', store_id: 'store-2', name: 'Gorra Snapback Classic', description: 'Ajustable, bordado frontal, varios colores disponibles.', price: 39900, old_price: null, category: 'ropa', image: 'https://picsum.photos/seed/p8/400/400', stock: 35, created_at: '2025-08-18' },

  // Casa & Hogar
  { id: 'p9', store_id: 'store-3', name: 'Lámpara LED Escritorio', description: 'Luz regulable en 3 tonos, brazo flexible, puerto USB.', price: 79900, old_price: null, category: 'hogar', image: 'https://picsum.photos/seed/p9/400/400', stock: 22, created_at: '2025-08-03' },
  { id: 'p10', store_id: 'store-3', name: 'Set de Ollas Antiadherente', description: '5 piezas, revestimiento cerámico, apto para inducción.', price: 199900, old_price: 259900, category: 'hogar', image: 'https://picsum.photos/seed/p10/400/400', stock: 12, created_at: '2025-08-09' },
  { id: 'p11', store_id: 'store-3', name: 'Organizador de Closet', description: 'Tela Oxford, 6 compartimentos, plegable y lavable.', price: 45900, old_price: null, category: 'hogar', image: 'https://picsum.photos/seed/p11/400/400', stock: 28, created_at: '2025-08-14' },

  // SportMax
  { id: 'p12', store_id: 'store-4', name: 'Mancuernas Ajustables 20kg', description: 'Par de mancuernas con discos intercambiables, agarre antideslizante.', price: 279900, old_price: 319900, category: 'deportes', image: 'https://picsum.photos/seed/p12/400/400', stock: 10, created_at: '2025-08-04' },
  { id: 'p13', store_id: 'store-4', name: 'Yoga Mat Premium 8mm', description: 'Antideslizante, ecológico, incluye correa de transporte.', price: 69900, old_price: null, category: 'deportes', image: 'https://picsum.photos/seed/p13/400/400', stock: 40, created_at: '2025-08-11' },
  { id: 'p14', store_id: 'store-4', name: 'Botella Térmica 750ml', description: 'Mantiene frío 24h / caliente 12h, acero inoxidable.', price: 54900, old_price: 69900, category: 'deportes', image: 'https://picsum.photos/seed/p14/400/400', stock: 55, created_at: '2025-08-16' },

  // Belleza Natural
  { id: 'p15', store_id: 'store-5', name: 'Serum Vitamina C 30ml', description: 'Ilumina y unifica el tono de la piel. 20% vitamina C pura.', price: 89900, old_price: null, category: 'belleza', image: 'https://picsum.photos/seed/p15/400/400', stock: 30, created_at: '2025-08-06' },
  { id: 'p16', store_id: 'store-5', name: 'Kit Skincare Completo', description: 'Limpiador + tónico + hidratante + protector solar. Ideal para todo tipo de piel.', price: 149900, old_price: 189900, category: 'belleza', image: 'https://picsum.photos/seed/p16/400/400', stock: 15, created_at: '2025-08-13' },

  // GamerHub
  { id: 'p17', store_id: 'store-6', name: 'Teclado Mecánico RGB', description: 'Switches blue, retroiluminación RGB personalizable, anti-ghosting.', price: 189900, old_price: 229900, category: 'electronica', image: 'https://picsum.photos/seed/p17/400/400', stock: 20, created_at: '2025-08-07' },
  { id: 'p18', store_id: 'store-6', name: 'Mouse Gamer 16000 DPI', description: 'Sensor óptico de alta precisión, 8 botones programables, RGB.', price: 99900, old_price: null, category: 'electronica', image: 'https://picsum.photos/seed/p18/400/400', stock: 25, created_at: '2025-08-17' },
  { id: 'p19', store_id: 'store-6', name: 'Silla Gamer Ergonómica', description: 'Soporte lumbar, reclinable 180°, reposabrazos 4D, cojín de memoria.', price: 599900, old_price: 699900, category: 'hogar', image: 'https://picsum.photos/seed/p19/400/400', stock: 8, created_at: '2025-08-19' },
  { id: 'p20', store_id: 'store-6', name: 'Monitor 27" 165Hz', description: 'QHD, 1ms, FreeSync Premium, HDR10. Ideal para gaming competitivo.', price: 899900, old_price: null, category: 'electronica', image: 'https://picsum.photos/seed/p20/400/400', stock: 6, created_at: '2025-08-20' },
];

// Pedidos de ejemplo (se llenan dinámicamente en demo)
const MOCK_ORDERS = [];

// Conversaciones de ejemplo
const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    store_id: 'store-1',
    store_name: 'TechZone',
    store_logo: 'https://ui-avatars.com/api/?name=TZ&background=146eb4&color=fff&size=128',
    last_message: '¡Hola! ¿En qué te puedo ayudar?',
    last_time: '10:30',
    unread: 1,
    messages: [
      { id: 1, from: 'store', text: '¡Hola! ¿En qué te puedo ayudar?', time: '10:30' },
    ]
  }
];

// Notificaciones de ejemplo
const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Bienvenido a MercadoPlus', body: 'Explora miles de productos de vendedores locales.', time: 'Hace 1h', read: false, type: 'system' },
];

window.MOCK_STORES = MOCK_STORES;
window.MOCK_PRODUCTS = MOCK_PRODUCTS;
window.MOCK_ORDERS = MOCK_ORDERS;
window.MOCK_CONVERSATIONS = MOCK_CONVERSATIONS;
window.MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS;
