/**
 * Mi Vitrina v0.1.1 - Configuración
 * Proyecto Supabase: Mi Vitrina (sdaruvqjvykrrbywiuuf)
 * Auth con Google se mantiene intacto en el proyecto.
 */

const CONFIG = {
  // ===== SUPABASE (Mi Vitrina) =====
  SUPABASE_URL: 'https://sdaruvqjvykrrbywiuuf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYXJ1dnFqdnlrcnJieXdpdXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTE0MzcsImV4cCI6MjEwNzk2NzQzN30.1QztH7xId-2L50uDkxCDyAUt-YAOgZQ63eKmp-FpZJk',

  // Correo del único administrador
  ADMIN_EMAIL: 'guillers240@gmail.com',

  // false = Supabase real
  DEMO_MODE: false,

  APP_NAME: 'Mi Vitrina',
  VERSION: '0.1.1',
  CURRENCY: 'CUP',
  CURRENCY_SYMBOL: '$',
};

window.CONFIG = CONFIG;
