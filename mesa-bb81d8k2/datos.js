// Capa de datos del panel. Habla con Supabase o, solo en la compu local
// y sin configurar, con datos de prueba en memoria (modo demo).

const cfg = window.VECTYO_CONFIG || {};
const configurado = cfg.supabaseUrl && !cfg.supabaseUrl.startsWith('PEGAR');
const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const MODO_DEMO = !configurado && esLocal;

function falla(error) {
  if (!error) return;
  const e = new Error(traducirError(error.message || String(error)));
  e.original = error;
  throw e;
}

export function traducirError(m) {
  const t = (m || '').toLowerCase();
  if (t.includes('invalid login')) return 'Mail o contraseña incorrectos.';
  if (t.includes('invalid totp') || t.includes('invalid code') || t.includes('expired')) return 'El código no es válido o venció. Probá con el que aparece ahora en la app.';
  if (t.includes('rate limit') || t.includes('too many')) return 'Demasiados intentos. Esperá unos minutos y volvé a probar.';
  if (t.includes('row-level security') || t.includes('permission') || t.includes('sin permiso')) return 'No tenés permiso para hacer esto.';
  if (t.includes('mime') || t.includes('invalid_mime')) return 'Ese tipo de archivo no está permitido.';
  if (t.includes('payload too large') || t.includes('exceeded the maximum')) return 'El archivo es demasiado grande.';
  if (t.includes('failed to fetch') || t.includes('network')) return 'No hay conexión. Revisá internet y volvé a probar.';
  return m;
}

// ===================================================================
// Supabase
// ===================================================================
function crearSupabase() {
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      storage: window.localStorage, // la sesión sigue al cerrar la pestaña; el corte por inactividad lo maneja app.js
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const urlCache = new Map();

  async function urlFirmada(bucket, path, segundos = 600) {
    if (!path) return null;
    const k = bucket + '/' + path;
    const c = urlCache.get(k);
    if (c && c.vence > Date.now()) return c.url;
    const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, segundos);
    falla(error);
    urlCache.set(k, { url: data.signedUrl, vence: Date.now() + (segundos - 60) * 1000 });
    return data.signedUrl;
  }

  async function sel(q) { const { data, error } = await q; falla(error); return data; }

  async function guardarEn(tabla, fila) {
    const { id, ...resto } = fila;
    const q = id
      ? sb.from(tabla).update(resto).eq('id', id).select().single()
      : sb.from(tabla).insert(resto).select().single();
    return sel(q);
  }

  return {
    async sesion() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    async iniciarSesion(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      falla(error);
    },
    async estadoMfa() {
      const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      falla(error);
      const f = await sb.auth.mfa.listFactors();
      falla(f.error);
      const verificados = (f.data.totp || []).filter((x) => x.status === 'verified');
      return { nivel: data.currentLevel, factor: verificados[0] || null, todos: f.data.all || [] };
    },
    async inscribirMfa() {
      const f = await sb.auth.mfa.listFactors();
      for (const x of (f.data?.all || [])) {
        if (x.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: x.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Panel Vectyo ' + Date.now() });
      falla(error);
      return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
    },
    async verificarMfa(factorId, code) {
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      falla(error);
    },
    async cerrarSesion() { await sb.auth.signOut(); urlCache.clear(); },
    alCambiarSesion(fn) { sb.auth.onAuthStateChange((ev) => fn(ev)); },
    async perfil() {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return null;
      const { data } = await sb.from('perfiles').select('*').eq('id', u.user.id).maybeSingle();
      return data;
    },
    async registrarIngreso() { await sb.rpc('registrar_ingreso'); },

    listarClientes: () => sel(sb.from('clientes').select('*').order('nombre')),
    obtenerCliente: (id) => sel(sb.from('clientes').select('*').eq('id', id).single()),
    guardarCliente: (c) => guardarEn('clientes', c),
    async borrarCliente(c) {
      const arch = await sel(sb.from('archivos').select('path').eq('cliente_id', c.id));
      if (arch.length) await sb.storage.from('archivos').remove(arch.map((a) => a.path));
      if (c.foto_path) await sb.storage.from('fotos').remove([c.foto_path]);
      await sel(sb.from('clientes').delete().eq('id', c.id));
    },
    async subirFoto(cliente, archivo) {
      const ext = { 'image/png': 'png', 'image/webp': 'webp' }[archivo.type] || 'jpg';
      const path = `${cliente.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('fotos').upload(path, archivo, { contentType: archivo.type, upsert: false });
      falla(error);
      const anterior = cliente.foto_path;
      await guardarEn('clientes', { id: cliente.id, foto_path: path });
      if (anterior) await sb.storage.from('fotos').remove([anterior]);
      return path;
    },
    urlFoto: (path) => urlFirmada('fotos', path, 3600),

    listarHistorial: (cid) => sel(sb.from('historial').select('*').eq('cliente_id', cid).order('fecha', { ascending: false }).order('creado_en', { ascending: false })),
    guardarHistorial: (h) => guardarEn('historial', h),
    borrarHistorial: (id) => sel(sb.from('historial').delete().eq('id', id)),

    listarAcuerdos: (cid) => sel(sb.from('acuerdos').select('*').eq('cliente_id', cid).order('fecha', { ascending: false })),
    listarTodosAcuerdos: () => sel(sb.from('acuerdos').select('*')),
    guardarAcuerdo: (a) => guardarEn('acuerdos', a),
    borrarAcuerdo: (id) => sel(sb.from('acuerdos').delete().eq('id', id)),

    listarMovimientos({ desde, hasta, clienteId } = {}) {
      let q = sb.from('movimientos').select('*').order('fecha', { ascending: false }).order('creado_en', { ascending: false });
      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);
      if (clienteId) q = q.eq('cliente_id', clienteId);
      return sel(q);
    },
    guardarMovimiento: (m) => guardarEn('movimientos', m),
    async guardarMovimientos(lista) { return sel(sb.from('movimientos').insert(lista).select()); },
    borrarMovimiento: (id) => sel(sb.from('movimientos').delete().eq('id', id)),

    listarArchivos: (cid) => sel(sb.from('archivos').select('*').eq('cliente_id', cid).order('creado_en', { ascending: false })),
    async subirArchivo(cid, archivo) {
      if (archivo.type !== 'application/pdf') throw new Error('Solo se pueden subir archivos PDF.');
      const path = `${cid}/${crypto.randomUUID()}.pdf`;
      const { error } = await sb.storage.from('archivos').upload(path, archivo, { contentType: 'application/pdf', upsert: false });
      falla(error);
      return guardarEn('archivos', { cliente_id: cid, nombre: archivo.name, path, tamano: archivo.size });
    },
    urlArchivo: (path) => urlFirmada('archivos', path, 300),
    async borrarArchivo(a) {
      await sel(sb.from('archivos').delete().eq('id', a.id));
      await sb.storage.from('archivos').remove([a.path]);
    },

    listarAuditoria: () => sel(sb.from('auditoria').select('*').order('cuando', { ascending: false }).limit(300)),
    listarPerfiles: () => sel(sb.from('perfiles').select('id,nombre,rol')),

    async copia() {
      const tablas = ['clientes', 'historial', 'acuerdos', 'movimientos', 'archivos', 'perfiles'];
      const out = { generado: new Date().toISOString() };
      for (const t of tablas) out[t] = await sel(sb.from(t).select('*'));
      return out;
    },
  };
}

// ===================================================================
// Demo (solo localhost, sin Supabase configurado). Datos inventados.
// ===================================================================
function crearDemo() {
  const uid = () => crypto.randomUUID();
  const yo = { id: 'demo-luciano', nombre: 'Luciano (demo)', rol: new URLSearchParams(location.search).get('rol') === 'equipo' ? 'equipo' : 'admin' };
  let logueado = false, nivel = 'aal1';
  const fotos = new Map();
  const db = { clientes: [], historial: [], acuerdos: [], movimientos: [], archivos: [], auditoria: [] };
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const f = (m, d) => `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const c1 = { id: uid(), nombre: 'Panadería La Espiga (demo)', contacto: 'Marta Gómez', rubro: 'Panadería', ciudad: 'San Luis', whatsapp: '2660000000', instagram: '@laespiga.demo', web: '', origen: 'Instagram', servicios: ['Web', 'Redes'], etapa: 'en-produccion', responsable: 'Luciano', proxima_accion: 'Mandar primera versión de la web', fecha_proxima_accion: f(hoy.getMonth() + 1, Math.min(28, hoy.getDate() + 2)), personalidad: 'Muy detallista y cálida. Le gusta sentirse escuchada.', forma_trabajo: 'Prefiere audios de WhatsApp y reuniones cortas los lunes.', canal_preferido: 'WhatsApp (audios)', horarios: 'Después de las 15 h', evitar: 'Mandarle mails largos.', notas: 'Dato de prueba.', foto_path: null };
  const c2 = { id: uid(), nombre: 'Estudio Contable Ríos (demo)', contacto: 'Pablo Ríos', rubro: 'Contador', ciudad: 'Villa Mercedes', whatsapp: '2660000001', instagram: '', web: 'https://ejemplo.com', origen: 'Referido', servicios: ['Automatización e IA'], etapa: 'propuesta', responsable: 'Juan', proxima_accion: 'Seguimiento de la propuesta', fecha_proxima_accion: f(hoy.getMonth() + 1, 1), personalidad: 'Directo, va al grano, mira números.', forma_trabajo: 'Todo por mail con resumen en viñetas.', canal_preferido: 'Mail', horarios: 'Mañanas', evitar: 'Llamadas sin agendar.', notas: '', foto_path: null };
  const c3 = { id: uid(), nombre: 'Gimnasio Pulso (demo)', contacto: 'Caro', rubro: 'Gimnasio', ciudad: 'San Luis', whatsapp: '', instagram: '@pulso.demo', web: '', origen: 'Instagram', servicios: ['Marketing y redes'], etapa: 'entregado', responsable: 'Luciano', personalidad: '', forma_trabajo: '', foto_path: null };
  db.clientes.push(c1, c2, c3);
  const a1 = { id: uid(), cliente_id: c1.id, concepto: 'Web institucional', tipo: 'proyecto', monto: 900000, moneda: 'ARS', fecha: f(Math.max(1, hoy.getMonth()), 5), estado: 'vigente', condiciones: '50% de seña, 50% contra entrega' };
  const a2 = { id: uid(), cliente_id: c3.id, concepto: 'Manejo de redes', tipo: 'mensual', monto: 250, moneda: 'USD', fecha: f(1, 10), estado: 'vigente', condiciones: 'Se cobra del 1 al 10 de cada mes' };
  db.acuerdos.push(a1, a2);
  db.historial.push({ id: uid(), cliente_id: c1.id, fecha: f(hoy.getMonth() + 1, 1), texto: 'Cobramos la seña y arrancamos el diseño.', creado_en: new Date().toISOString() });
  const mov = (fecha, tipo, categoria, monto, moneda, extra = {}) => db.movimientos.push({ id: uid(), fecha, tipo, categoria, monto, moneda, descripcion: '', fijo: false, creado_por: 'demo-otro', creado_en: new Date().toISOString(), ...extra });
  mov(f(Math.max(1, hoy.getMonth()), 6), 'ingreso', 'Seña', 450000, 'ARS', { cliente_id: c1.id, acuerdo_id: a1.id });
  for (let m = 1; m <= hoy.getMonth() + 1; m++) {
    mov(f(m, 3), 'gasto', 'Software y suscripciones', 25000, 'ARS', { descripcion: 'Artlist Pro', fijo: true });
    mov(f(m, 5), 'gasto', 'Hosting y dominios', 8000, 'ARS', { fijo: true });
    if (m % 2) mov(f(m, 14), 'gasto', 'Publicidad', 30000 + m * 2000, 'ARS', { descripcion: 'Anuncios Instagram' });
    if (m % 3 === 0) mov(f(m, 20), 'gasto', 'Varios', 12000, 'ARS', { descripcion: 'Café con cliente' });
    mov(f(m, 8), 'ingreso', 'Pago de proyecto', 200000 + m * 35000, 'ARS');
    mov(f(m, 9), 'ingreso', 'Abono mensual', 250, 'USD', { cliente_id: c3.id, acuerdo_id: a2.id });
  }

  const espera = (x) => new Promise((r) => setTimeout(() => r(structuredClone(x)), 120));
  const log = (tabla, accion, fila) => db.auditoria.unshift({ id: db.auditoria.length + 1, cuando: new Date().toISOString(), quien: yo.id, quien_nombre: yo.nombre, tabla, accion, registro_id: fila?.id, detalle: fila || null });
  function guardar(tabla, fila) {
    if (fila.id) {
      const i = db[tabla].findIndex((x) => x.id === fila.id);
      db[tabla][i] = { ...db[tabla][i], ...fila };
      log(tabla, 'update', db[tabla][i]);
      return espera(db[tabla][i]);
    }
    const nueva = { ...fila, id: uid(), creado_por: yo.id, creado_en: new Date().toISOString() };
    db[tabla].push(nueva);
    log(tabla, 'insert', nueva);
    return espera(nueva);
  }
  function borrar(tabla, id) {
    if (yo.rol !== 'admin') return Promise.reject(new Error('No tenés permiso para hacer esto.'));
    const fila = db[tabla].find((x) => x.id === id);
    db[tabla] = db[tabla].filter((x) => x.id !== id);
    log(tabla, 'delete', fila);
    return espera(null);
  }
  const movVisibles = () => db.movimientos.filter((m) => yo.rol === 'admin' || m.cliente_id || m.creado_por === yo.id);

  return {
    async sesion() { return logueado ? { user: { id: yo.id } } : null; },
    async iniciarSesion(email, pass) { if (!email || !pass) throw new Error('Mail o contraseña incorrectos.'); logueado = true; },
    async estadoMfa() { return { nivel, factor: sessionStorage.getItem('demo-mfa') ? { id: 'f1' } : null }; },
    async inscribirMfa() { return { factorId: 'f1', qr: 'favicon.svg', secreto: 'DEMO-SECRETO-2FA' }; },
    async verificarMfa(_f, code) { if (!/^\d{6}$/.test(code)) throw new Error('El código no es válido o venció. Probá con el que aparece ahora en la app.'); sessionStorage.setItem('demo-mfa', '1'); nivel = 'aal2'; },
    async cerrarSesion() { logueado = false; nivel = 'aal1'; },
    alCambiarSesion() {},
    async perfil() { return nivel === 'aal2' ? yo : null; },
    async registrarIngreso() { log('sesion', 'ingreso', null); },

    listarClientes: () => espera([...db.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre))),
    obtenerCliente: (id) => espera(db.clientes.find((c) => c.id === id)),
    guardarCliente: (c) => guardar('clientes', c),
    borrarCliente: (c) => borrar('clientes', c.id),
    async subirFoto(c, archivo) { const p = uid(); fotos.set(p, URL.createObjectURL(archivo)); await guardar('clientes', { id: c.id, foto_path: p }); return p; },
    urlFoto: async (p) => fotos.get(p) || null,

    listarHistorial: (cid) => espera(db.historial.filter((h) => h.cliente_id === cid).sort((a, b) => b.fecha.localeCompare(a.fecha))),
    guardarHistorial: (h) => guardar('historial', h),
    borrarHistorial: (id) => borrar('historial', id),
    listarAcuerdos: (cid) => espera(db.acuerdos.filter((a) => a.cliente_id === cid)),
    listarTodosAcuerdos: () => espera(db.acuerdos),
    guardarAcuerdo: (a) => guardar('acuerdos', a),
    borrarAcuerdo: (id) => borrar('acuerdos', id),
    listarMovimientos({ desde, hasta, clienteId } = {}) {
      return espera(movVisibles().filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta) && (!clienteId || m.cliente_id === clienteId)).sort((a, b) => b.fecha.localeCompare(a.fecha)));
    },
    guardarMovimiento: (m) => guardar('movimientos', m),
    async guardarMovimientos(lista) { const r = []; for (const m of lista) r.push(await guardar('movimientos', m)); return r; },
    borrarMovimiento: (id) => borrar('movimientos', id),
    listarArchivos: (cid) => espera(db.archivos.filter((a) => a.cliente_id === cid)),
    async subirArchivo(cid, archivo) {
      if (archivo.type !== 'application/pdf') throw new Error('Solo se pueden subir archivos PDF.');
      const p = uid(); fotos.set(p, URL.createObjectURL(archivo));
      return guardar('archivos', { cliente_id: cid, nombre: archivo.name, path: p, tamano: archivo.size });
    },
    urlArchivo: async (p) => fotos.get(p),
    borrarArchivo: (a) => borrar('archivos', a.id),
    listarAuditoria: () => espera(db.auditoria),
    listarPerfiles: () => espera([yo]),
    async copia() { return { generado: new Date().toISOString(), ...structuredClone(db) }; },
  };
}

export const datos = MODO_DEMO ? crearDemo() : (configurado ? crearSupabase() : null);
