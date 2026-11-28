// Datos del proyecto de Supabase (Supabase > Project Settings > API).
// La clave "publishable" o "anon" es PÚBLICA por diseño: la seguridad la ponen
// las reglas de la base (supabase/01-esquema.sql), el código de 2 pasos y Cloudflare Access.
// NUNCA pegar acá la clave "secret" ni la "service_role".
window.VECTYO_CONFIG = {
  supabaseUrl: 'https://rauekiejjkxgfoyicyhy.supabase.co',
  supabaseKey: 'sb_publishable_8NV1VqnKM6fKALVgSIyCUw_2zN5BGgx',
  minutosInactividad: 480, // 8 horas sin uso y pide entrar de nuevo
  ia: false, // poner true cuando la función "ia" esté publicada en Supabase (ver INSTALACION.md → IA)
};
