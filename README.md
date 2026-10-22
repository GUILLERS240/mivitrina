# MercadoPlus v0.1

Tienda online estilo Amazon donde **clientes y vendedores** comparten la misma plataforma.

## Características (v0.1)

### Vista cliente (responsive PC + móvil)
- **Menú inferior fijo en móvil**: Inicio | Tiendas | Pedidos | Mi Perfil
- **Inicio**: todos los productos de todas las tiendas (filtro por categoría, orden y búsqueda)
- **Tiendas**: grid de 2 columnas en móvil con tarjetas de tiendas
- **Pedidos**: historial de pedidos con estados (pendiente / aceptado / enviado / entregado / cancelado)
- **Mi Perfil**: datos personales + configuración de app (modo claro/oscuro, notificaciones…)
- Iconos superiores (logueado): **Mensajes**, **Notificaciones**, **Carrito**
- Pedidos 100 % internos (sin WhatsApp)
- Chat con vendedores
- Solicitud para convertirse en vendedor desde el perfil

### Panel Vendedor (`seller.html`)
- Dashboard con estadísticas
- Gestión de productos (crear / eliminar)
- Gestión de pedidos (aceptar / rechazar)
- Configuración de la tienda

### Panel Admin (`admin.html`)
- **Solo accesible con el correo** `guillers240@gmail.com`
- Dashboard global
- Gestión de usuarios
- Aprobar / rechazar solicitudes de vendedor
- Ver tiendas y pedidos
- Configuración general del sitio

---

## Cómo probar ahora (modo DEMO)

1. Abre `index.html` en el navegador (o sirve la carpeta con cualquier servidor estático).
2. Regístrate con cualquier correo (en demo se verifica automáticamente).
3. Para entrar como **admin**, regístrate o inicia sesión con:
   ```
   Correo: guillers240@gmail.com
   Contraseña: (la que elijas al registrarte)
   ```
4. Navega, agrega productos al carrito, realiza pedidos, solicita ser vendedor, etc.
5. Los datos se guardan en `localStorage` del navegador.

> En modo DEMO no necesitas Supabase. Todo funciona localmente.

---

## Conectar con Supabase (producción)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Project Settings → API** y copia:
   - Project URL
   - `anon` `public` key
3. Abre `js/config.js` y reemplaza:
   ```js
   SUPABASE_URL: 'https://TU_PROYECTO.supabase.co',
   SUPABASE_ANON_KEY: 'TU_ANON_KEY_AQUI',
   DEMO_MODE: false,   // ← importante
   ```
4. En el **SQL Editor** de Supabase pega y ejecuta todo el contenido de:
   ```
   supabase-schema.sql
   ```
5. En **Authentication → Providers** asegúrate de que Email esté habilitado y, si quieres, activa la confirmación de correo.
6. ¡Listo! La app usará Supabase Auth, base de datos y RLS.

### Estructura de tablas creadas
| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (extiende auth.users) |
| `stores` | Tiendas de vendedores |
| `products` | Productos |
| `orders` | Pedidos |
| `order_items` | Ítems de cada pedido |
| `seller_requests` | Solicitudes para ser vendedor |
| `conversations` / `messages` | Chat cliente ↔ vendedor |
| `notifications` | Notificaciones in-app |

El trigger `handle_new_user` crea automáticamente el perfil y asigna rol `admin` si el correo es `guillers240@gmail.com`.

---

## Estructura de archivos

```
tienda-online/
├── index.html          ← Tienda principal (cliente)
├── seller.html         ← Panel del vendedor
├── admin.html          ← Panel de administración
├── css/
│   └── style.css       ← Estilos responsive + dark mode
├── js/
│   ├── config.js       ← Configuración (Supabase + admin email)
│   ├── data.js         ← Datos mock de demostración
│   ├── supabase-client.js  ← Cliente + DataService
│   ├── auth.js         ← Autenticación (demo + Supabase)
│   └── app.js          ← Lógica principal de la tienda
├── supabase-schema.sql ← Schema completo para Supabase
└── README.md
```

---

## Próximas versiones (roadmap sugerido)

- [ ] Subida real de imágenes (Supabase Storage)
- [ ] Notificaciones en tiempo real (Supabase Realtime)
- [ ] Chat en tiempo real
- [ ] Pagos (Wompi / Mercado Pago / Stripe)
- [ ] Sistema de reseñas y calificaciones
- [ ] Filtros avanzados y favoritos
- [ ] App PWA / notificaciones push
- [ ] Multi-idioma

---

**Versión:** 0.1.0  
**Autor:** MercadoPlus  
**Admin:** guillers240@gmail.com
