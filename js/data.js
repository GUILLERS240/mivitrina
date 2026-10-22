/**
 * Datos de respaldo (v0.1.1) — Mi Vitrina
 * Sin productos de prueba. Con Supabase se cargan datos reales.
 */

const MOCK_STORES = [];
const MOCK_PRODUCTS = [];
const MOCK_ORDERS = [];
const MOCK_CONVERSATIONS = [];
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Bienvenido a Mi Vitrina',
    body: 'Explora productos de vendedores locales.',
    time: 'Ahora',
    read: false,
    type: 'system',
  },
];

window.MOCK_STORES = MOCK_STORES;
window.MOCK_PRODUCTS = MOCK_PRODUCTS;
window.MOCK_ORDERS = MOCK_ORDERS;
window.MOCK_CONVERSATIONS = MOCK_CONVERSATIONS;
window.MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS;
