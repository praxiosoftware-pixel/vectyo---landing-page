// Capa de datos del panel. Habla con Supabase o, solo en la compu local
// y sin configurar, con datos de prueba en memoria (modo demo).

const cfg = window.VECTYO_CONFIG || {};
const configurado = cfg.supabaseUrl && !cfg.supabaseUrl.startsWith('PEGAR');
const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const MODO_DEMO = esLocal && (!configurado || new URLSearchParams(location.search).has('demo'));

function falla(error) {
  if (!error) return;
  const e = new Error(traducirError(error.message || String(error)));
  e.original = error;
  throw e;
}

export function traducirError(m) {
  const t = (m || '').toLowerCase();
  if (t.includes('invalid login')) return 'Mail o contraseña incorrectos.';
  if (t.includes('email not confirmed')) return 'Todavía no confirmaste tu mail. Buscá el mail de confirmación (mirá también en spam) y tocá el link.';
  if (t.includes('signup') && t.includes('disabled')) return 'Por ahora no se pueden crear cuentas nuevas.';
  if (t.includes('already registered')) return 'Ya hay una cuenta con ese mail. Entrá con tu contraseña.';
  if (t.includes('password should') || t.includes('weak password') || t.includes('weak_password')) return 'La contraseña es muy débil. Usá al menos 12 caracteres con minúsculas, mayúsculas, números y un símbolo.';
  if (t.includes('perfiles_usuario_unico') || (t.includes('duplicate key') && t.includes('usuario'))) return 'Ese @usuario ya lo usa otra persona. Probá con otro.';
  if (t.includes('perfiles_usuario_formato')) return 'El @usuario va de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.';
  if (t.includes('menu_pos')) return 'No se pudo guardar la posición del menú en tu cuenta (falta correr 11-menu.sql). En este dispositivo igual queda aplicada.';
  if (t.includes('perfiles_tema_check') || (t.includes('tema') && t.includes('column'))) return 'No se pudo guardar el estilo en tu cuenta (falta correr 09-estilos.sql). En este dispositivo igual queda aplicado.';
  if (t.includes('perfiles_descripcion_largo')) return 'La descripción puede tener hasta 160 caracteres.';
  if (t.includes('fecha de nacimiento')) return 'La fecha de nacimiento no es válida (hay que tener al menos 13 años).';
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
// Deja en cada cliente la lista de ids de sus integrantes (miembros_ids).
function conMiembros(c) {
  const { cliente_miembros, ...resto } = c;
  return { ...resto, miembros_ids: (cliente_miembros || []).map((m) => m.usuario_id) };
}
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
  async function miId() { const { data } = await sb.auth.getSession(); return data.session?.user?.id; }

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
    // Cuenta nueva. El perfil (rol "usuario") lo crea la base sola.
    async registrarse(nombre, email, password) {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { nombre }, emailRedirectTo: location.origin + location.pathname },
      });
      falla(error);
      return { necesitaConfirmar: !data.session };
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
    async cerrarSesion() { await sb.removeAllChannels(); await sb.auth.signOut(); urlCache.clear(); },
    alCambiarSesion(fn) { sb.auth.onAuthStateChange((ev) => fn(ev)); },
    async perfil() {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return null;
      const { data } = await sb.from('perfiles').select('*').eq('id', u.user.id).maybeSingle();
      return data;
    },
    async registrarIngreso() { await sb.rpc('registrar_ingreso'); },
    async guardarPerfil(campos) {
      const { data: u } = await sb.auth.getUser();
      return sel(sb.from('perfiles').update(campos).eq('id', u.user.id).select().single());
    },
    // tipo: 'foto' o 'banner'. Va a la carpeta propia del depósito privado "perfiles".
    async subirImagenPerfil(perfil, tipo, archivo) {
      const ext = { 'image/png': 'png', 'image/webp': 'webp' }[archivo.type] || 'jpg';
      const path = `${perfil.id}/${tipo}-${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from('perfiles').upload(path, archivo, { contentType: archivo.type, upsert: false });
      falla(error);
      const col = { banner: 'banner_path', fondo: 'fondo_path' }[tipo] || 'foto_path';
      const anterior = perfil[col];
      const nuevo = await this.guardarPerfil({ [col]: path });
      if (anterior) await sb.storage.from('perfiles').remove([anterior]);
      return nuevo;
    },
    urlImagenPerfil: (path) => urlFirmada('perfiles', path, 3600),

    async listarClientes() {
      const l = await sel(sb.from('clientes').select('*, cliente_miembros(usuario_id)').order('nombre'));
      return l.map(conMiembros);
    },
    async obtenerCliente(id) {
      const c = await sel(sb.from('clientes').select('*, cliente_miembros(usuario_id)').eq('id', id).maybeSingle());
      return c ? conMiembros(c) : null;
    },
    async guardarCliente(c) {
      const { miembros_ids, ...fila } = c;
      return conMiembros({ cliente_miembros: [], ...await guardarEn('clientes', fila) });
    },
    // Integrantes de un cliente compartido, con su perfil.
    async listarIntegrantes(cid) {
      const ms = await sel(sb.from('cliente_miembros').select('usuario_id, rol, creado_en').eq('cliente_id', cid).order('creado_en'));
      if (!ms.length) return [];
      const ps = await sel(sb.from('perfiles').select('id, nombre, usuario, foto_path').in('id', ms.map((m) => m.usuario_id)));
      return ms.map((m) => ({ ...(ps.find((x) => x.id === m.usuario_id) || { id: m.usuario_id, nombre: 'Cuenta' }), ...m }));
    },
    async agregarIntegrante(cid, buscado) {
      const { data, error } = await sb.rpc('agregar_integrante', { cid, buscado });
      falla(error);
      return data;
    },
    quitarIntegrante: (cid, usuarioId) => sel(sb.from('cliente_miembros').delete().eq('cliente_id', cid).eq('usuario_id', usuarioId)),

    // Tareas y feed de los clientes compartidos. Quién completa y cuándo lo pone la base.
    listarTareas: (cid) => sel(sb.from('tareas').select('*').eq('cliente_id', cid).order('estado').order('creado_en', { ascending: false })),
    async listarMisTareas() {
      const { data: u } = await sb.auth.getUser();
      return sel(sb.from('tareas').select('*, clientes(nombre)').eq('asignada_a', u.user.id).eq('estado', 'pendiente').order('vence', { ascending: true, nullsFirst: false }));
    },
    guardarTarea: (t) => guardarEn('tareas', t),
    completarTarea: (id) => guardarEn('tareas', { id, estado: 'hecha' }),
    reabrirTarea: (id) => guardarEn('tareas', { id, estado: 'pendiente' }),
    borrarTarea: (id) => sel(sb.from('tareas').delete().eq('id', id)),
    listarFeed: (cid) => sel(sb.from('feed').select('*').eq('cliente_id', cid).order('creado_en', { ascending: false }).limit(60)),

    // Red: directorio, amigos por código y mensajes (solo entre amigos; lo hace cumplir la base).
    // IA (Claude): siempre a través de la función "ia" de Supabase. La página nunca ve la clave.
    async ia(accion, datosPedido) {
      const { data, error } = await sb.functions.invoke('ia', { body: { accion, ...datosPedido } });
      if (error) {
        let msg = 'La IA no está disponible ahora. Probá en un rato.';
        try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* sin cuerpo */ }
        throw new Error(msg);
      }
      return data;
    },
    async iaMiUso() { const { data, error } = await sb.rpc('ia_mi_uso'); falla(error); return data; },
    listarRed: () => sel(sb.from('red_perfiles').select('*').order('nombre')),
    async miCodigoAmigo() { const { data, error } = await sb.rpc('mi_codigo_amigo'); falla(error); return data; },
    async renovarCodigoAmigo() { const { data, error } = await sb.rpc('renovar_codigo_amigo'); falla(error); return data; },
    async perfilPorCodigo(cod) { const { data, error } = await sb.rpc('perfil_por_codigo', { cod }); falla(error); return data; },
    async enviarSolicitud(cod) { const { data, error } = await sb.rpc('enviar_solicitud', { cod }); falla(error); return data; },
    async responderSolicitud(sid, aceptar) { const { error } = await sb.rpc('responder_solicitud', { sid, aceptar }); falla(error); },
    listarAmistades: () => sel(sb.from('amistades').select('*')),
    eliminarAmistad: (id) => sel(sb.from('amistades').delete().eq('id', id)),
    async listarMensajes(otro) {
      const me = await miId();
      const l = await sel(sb.from('mensajes').select('*')
        .or(`and(de.eq.${me},para.eq.${otro}),and(de.eq.${otro},para.eq.${me})`)
        .order('creado_en', { ascending: false }).limit(300));
      return l.reverse();
    },
    resumenMensajes: () => sel(sb.from('mensajes').select('id, de, para, texto, creado_en, leido_en').order('creado_en', { ascending: false }).limit(500)),
    enviarMensaje: (para, texto) => sel(sb.from('mensajes').insert({ para, texto }).select().single()),
    async marcarLeidos(otro) { await sb.rpc('marcar_leidos', { otro }); },
    async contarAvisosRed() {
      const me = await miId();
      const [m, a] = await Promise.all([
        sb.from('mensajes').select('id', { count: 'exact', head: true }).eq('para', me).is('leido_en', null),
        sb.from('amistades').select('id', { count: 'exact', head: true }).eq('para', me).eq('estado', 'pendiente'),
      ]);
      return { mensajes: m.count || 0, solicitudes: a.count || 0 };
    },
    // Avisos al instante: mensajes que me llegan y cambios en mis amistades.
    async escucharRed(alCambiar) {
      const me = await miId();
      const canal = sb.channel('red-' + me)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `para=eq.${me}` }, (x) => alCambiar({ tipo: 'mensaje', fila: x.new }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amistades', filter: `para=eq.${me}` }, () => alCambiar({ tipo: 'amistad' }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'amistades', filter: `de=eq.${me}` }, () => alCambiar({ tipo: 'amistad' }))
        .subscribe();
      return () => sb.removeChannel(canal);
    },
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
    listarPerfiles: () => sel(sb.from('perfiles').select('id,nombre,rol,usuario,foto_path')),

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
  const rolDemo = new URLSearchParams(location.search).get('rol');
  const yo = { id: 'demo-luciano', nombre: 'Luciano (demo)', rol: ['equipo', 'usuario'].includes(rolDemo) ? rolDemo : 'admin',
    usuario: null, descripcion: null, fecha_nacimiento: null, mostrar_edad: true, foto_path: null, banner_path: null,
    instagram: null, tiktok: null, linkedin: null, x: null, web: null, whatsapp: null,
    tema: localStorage.getItem('vy-tema') || 'vectyo', fondo_path: null, menu_pos: localStorage.getItem('vy-menu') || 'izquierda',
    perfil_completo: new URLSearchParams(location.search).has('completo') };
  let logueado = false, nivel = 'aal1';
  const fotos = new Map();
  const db = { clientes: [], historial: [], acuerdos: [], movimientos: [], archivos: [], auditoria: [] };
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const f = (m, d) => `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const c1 = { id: uid(), nombre: 'Panadería La Espiga (demo)', contacto: 'Marta Gómez', rubro: 'Panadería', ciudad: 'San Luis', whatsapp: '2660000000', instagram: '@laespiga.demo', web: '', origen: 'Instagram', servicios: ['Web', 'Redes'], etapa: 'en-produccion', responsable: 'Luciano', proxima_accion: 'Mandar primera versión de la web', fecha_proxima_accion: f(hoy.getMonth() + 1, Math.min(28, hoy.getDate() + 2)), personalidad: 'Muy detallista y cálida. Le gusta sentirse escuchada.', forma_trabajo: 'Prefiere audios de WhatsApp y reuniones cortas los lunes.', canal_preferido: 'WhatsApp (audios)', horarios: 'Después de las 15 h', evitar: 'Mandarle mails largos.', notas: 'Dato de prueba.', foto_path: null };
  const c2 = { id: uid(), nombre: 'Estudio Contable Ríos (demo)', contacto: 'Pablo Ríos', rubro: 'Contador', ciudad: 'Villa Mercedes', whatsapp: '2660000001', instagram: '', web: 'https://ejemplo.com', origen: 'Referido', servicios: ['Automatización e IA'], etapa: 'propuesta', responsable: 'Juan', proxima_accion: 'Seguimiento de la propuesta', fecha_proxima_accion: f(hoy.getMonth() + 1, 1), personalidad: 'Directo, va al grano, mira números.', forma_trabajo: 'Todo por mail con resumen en viñetas.', canal_preferido: 'Mail', horarios: 'Mañanas', evitar: 'Llamadas sin agendar.', notas: '', foto_path: null };
  const c3 = { id: uid(), nombre: 'Gimnasio Pulso (demo)', contacto: 'Caro', rubro: 'Gimnasio', ciudad: 'San Luis', whatsapp: '', instagram: '@pulso.demo', web: '', origen: 'Instagram', servicios: ['Marketing y redes'], etapa: 'entregado', responsable: 'Luciano', personalidad: '', forma_trabajo: '', foto_path: null };
  c2.responsable = 'Juan (demo)';
  const c4 = { id: uid(), nombre: 'Kiosco de Juan (demo)', contacto: 'Ana', rubro: 'Kiosco', ciudad: 'Juana Koslay', servicios: ['Páginas web'], etapa: 'consulta', responsable: 'Juan (demo)', notas: 'Personal de Juan: solo lo ve él y el admin.', foto_path: null };
  const LU = 'demo-luciano';
  for (const c of [c1, c3]) Object.assign(c, { tipo: 'personal', dueno_id: LU });
  Object.assign(c2, { tipo: 'compartido', dueno_id: LU });
  Object.assign(c4, { tipo: 'personal', dueno_id: 'demo-juan' });
  db.clientes.push(c1, c2, c3, c4);
  const perfilesDemo = [
    { id: LU, nombre: 'Luciano (demo)', usuario: 'luciano', email: 'luciano@vectyo.com', rol: 'admin', foto_path: null, codigo: 'K7QH-3MXP', descripcion: 'Fundador de Vectyo. Webs, IA y marca para negocios de San Luis.', edad: 27, instagram: '@vectyo', web: 'vectyo.com', whatsapp: '2664639451' },
    { id: 'demo-juan', nombre: 'Juan (demo)', usuario: 'juanchi', email: 'juanchi@vectyo.com', rol: 'usuario', foto_path: null, codigo: 'JUAN-7RTE', descripcion: 'Ventas y redes en Vectyo. Si tenés un negocio, hablemos.', edad: 26, instagram: '@juanchi.demo', whatsapp: '2660000002' },
    { id: 'demo-marta', nombre: 'Marta Prueba (demo)', usuario: 'marta', email: 'marta@ejemplo.com', rol: 'usuario', foto_path: null, codigo: 'MRTA-8KQW', descripcion: 'Fotografía de producto para tiendas online.', edad: null, instagram: '@marta.foto', tiktok: '@marta.foto' },
    { id: 'demo-sofi', nombre: 'Sofía Prueba (demo)', usuario: 'sofi.ux', email: 'sofi@ejemplo.com', rol: 'usuario', foto_path: null, codigo: 'SOFI-5HNB', descripcion: 'Diseño UX/UI. Prototipos en Figma en 48 h.', edad: 31, linkedin: 'sofia-prueba', web: 'sofi.design' },
    { id: 'demo-tomas', nombre: 'Tomás Prueba (demo)', usuario: 'tomas.dev', email: 'tomas@ejemplo.com', rol: 'usuario', foto_path: null, codigo: 'TMAS-9WXE', descripcion: 'Automatizaciones con IA y bots de WhatsApp.', edad: 24, x: '@tomasdev', instagram: '@tomas.dev' },
  ];
  db.miembros = [
    { cliente_id: c2.id, usuario_id: LU, rol: 'dueno', creado_en: new Date().toISOString() },
    { cliente_id: c2.id, usuario_id: 'demo-juan', rol: 'integrante', creado_en: new Date().toISOString() },
  ];
  // ?como=juan: el demo se ve como Juan (usuario e integrante del compartido).
  if (new URLSearchParams(location.search).get('como') === 'juan') Object.assign(yo, { id: 'demo-juan', nombre: 'Juan (demo)', rol: 'usuario', usuario: 'juanchi' });
  const otrosPerfiles = () => perfilesDemo.filter((x) => x.id !== yo.id);
  // Tareas y feed de prueba en el compartido (esta semana: Juan 3 tareas, Luciano 2).
  db.tareas = []; db.feed = [];
  const haceDias = (d, hora = 11) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(hora, 0, 0, 0); return x.toISOString(); };
  const diaSemana = (new Date().getDay() + 6) % 7; // 0 = lunes
  const enSemana = (d) => (Math.min(d, diaSemana) === 0 ? new Date(Date.now() - 30 * 60000).toISOString() : haceDias(Math.min(d, diaSemana)));
  const tarea = (titulo, importancia, asignada_a, extra = {}) => {
    const t = { id: uid(), cliente_id: c2.id, titulo, detalle: null, importancia, asignada_a, vence: null, estado: 'pendiente', completada_por: null, completada_en: null, creado_por: LU, creado_en: haceDias(9), ...extra };
    db.tareas.push(t);
    db.feed.push({ id: uid(), cliente_id: c2.id, tipo: 'tarea_creada', autor: LU, otro: asignada_a, tarea_id: t.id, texto: titulo, puntos: importancia, creado_en: t.creado_en });
    if (t.estado === 'hecha') db.feed.push({ id: uid(), cliente_id: c2.id, tipo: 'tarea_hecha', autor: t.completada_por, tarea_id: t.id, texto: titulo, puntos: importancia, creado_en: t.completada_en });
    return t;
  };
  const hecha = (quien, cuando) => ({ estado: 'hecha', completada_por: quien, completada_en: cuando });
  tarea('Relevar los procesos del estudio', 3, 'demo-juan', hecha('demo-juan', enSemana(3)));
  tarea('Armar el formulario de alta de clientes', 2, 'demo-juan', hecha('demo-juan', enSemana(2)));
  tarea('Probar el bot de turnos con 5 casos', 1, 'demo-juan', hecha('demo-juan', enSemana(1)));
  tarea('Mandar la propuesta final', 5, LU, hecha(LU, enSemana(2)));
  tarea('Llamada de seguimiento con Pablo', 2, LU, hecha(LU, enSemana(0)));
  tarea('Conectar el bot con WhatsApp Business', 3, 'demo-juan', hecha('demo-juan', haceDias(diaSemana + 3)));
  tarea('Cargar las preguntas frecuentes al bot', 2, 'demo-juan', { vence: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) });
  tarea('Preparar la factura de la seña', 1, LU, { vence: new Date(Date.now() - 864e5).toISOString().slice(0, 10) });
  tarea('Definir colores del panel del estudio', 3, null);
  db.feed.push({ id: uid(), cliente_id: c2.id, tipo: 'integrante_entro', autor: LU, otro: 'demo-juan', creado_en: haceDias(10) });
  // Red de prueba: Juan es amigo, Marta te mandó solicitud, a Sofía le mandaste vos, Tomás es un extraño.
  db.amistades = [
    { id: uid(), de: LU, para: 'demo-juan', estado: 'aceptada', creado_en: haceDias(20) },
    { id: uid(), de: 'demo-marta', para: LU, estado: 'pendiente', creado_en: haceDias(1) },
    { id: uid(), de: LU, para: 'demo-sofi', estado: 'pendiente', creado_en: haceDias(2) },
  ];
  db.mensajes = [
    { id: uid(), de: LU, para: 'demo-juan', texto: '¿Pudiste llamar a Pablo del estudio?', creado_en: haceDias(1, 10), leido_en: haceDias(1, 10) },
    { id: uid(), de: 'demo-juan', para: LU, texto: 'Sí, le encantó la propuesta. Mañana manda la seña.', creado_en: haceDias(1, 12), leido_en: haceDias(1, 13) },
    { id: uid(), de: 'demo-juan', para: LU, texto: 'Te dejé una tarea nueva en el compartido 👀', creado_en: new Date(Date.now() - 20 * 60000).toISOString(), leido_en: null },
  ];
  let oyenteRed = null;
  let iaUsados = 0;
  const amigosDemo = (a, b) => db.amistades.some((x) => x.estado === 'aceptada' && ((x.de === a && x.para === b) || (x.de === b && x.para === a)));
  const alFeed = (cid, fila) => { if (db.clientes.find((c) => c.id === cid)?.tipo === 'compartido') db.feed.push({ id: uid(), cliente_id: cid, creado_en: new Date().toISOString(), ...fila }); };
  const integrantes = (cid) => db.miembros.filter((m) => m.cliente_id === cid);
  const puedeVer = (c) => !!c && (yo.rol === 'admin' || c.dueno_id === yo.id || (c.tipo === 'compartido' && integrantes(c.id).some((m) => m.usuario_id === yo.id)));
  const puedeVerId = (cid) => puedeVer(db.clientes.find((c) => c.id === cid));
  const conIds = (c) => ({ ...c, miembros_ids: integrantes(c.id).map((m) => m.usuario_id) });
  const sinPermiso = () => Promise.reject(new Error('No tenés permiso para hacer esto.'));
  const a1 = { id: uid(), cliente_id: c1.id, concepto: 'Web institucional', tipo: 'proyecto', monto: 900000, moneda: 'ARS', fecha: f(Math.max(1, hoy.getMonth()), 5), estado: 'vigente', condiciones: '50% de seña, 50% contra entrega' };
  const a2 = { id: uid(), cliente_id: c3.id, concepto: 'Manejo de redes', tipo: 'mensual', monto: 250, moneda: 'USD', fecha: f(1, 10), estado: 'vigente', condiciones: 'Se cobra del 1 al 10 de cada mes' };
  db.acuerdos.push(a1, a2);
  db.historial.push({ id: uid(), cliente_id: c1.id, fecha: f(hoy.getMonth() + 1, 1), texto: 'Cobramos la seña y arrancamos el diseño.', creado_en: new Date().toISOString() });
  const mov = (fecha, tipo, categoria, monto, moneda, extra = {}) => db.movimientos.push({ id: uid(), fecha, tipo, categoria, monto, moneda, descripcion: categoria, frecuencia: 'unico', fecha_fin: null, creado_por: 'demo-otro', dueno_id: 'demo-luciano', creado_en: new Date().toISOString(), ...extra });
  mov(f(Math.max(1, hoy.getMonth()), 6), 'ingreso', 'Seña', 450000, 'ARS', { descripcion: 'Seña web La Espiga', cliente_id: c1.id, acuerdo_id: a1.id });
  mov(f(1, 3), 'gasto', 'Otro', 25000, 'ARS', { descripcion: 'Artlist Pro', frecuencia: 'mensual' });
  mov(f(1, 5), 'gasto', 'Hosting', 8000, 'ARS', { descripcion: 'Hosting web clientes', frecuencia: 'mensual' });
  mov(f(3, 1), 'gasto', 'Herramienta IA', 20, 'USD', { descripcion: 'Claude Pro', frecuencia: 'mensual' });
  mov(f(2, 15), 'gasto', 'Dominios', 18000, 'ARS', { descripcion: 'Dominio vectyo.com', frecuencia: 'anual' });
  mov(f(1, 10), 'gasto', 'Base de datos', 9000, 'ARS', { descripcion: 'Base de datos vieja', frecuencia: 'mensual', fecha_fin: f(6, 30) });
  mov(f(1, 9), 'ingreso', 'Abono mensual', 250, 'USD', { descripcion: 'Redes Gimnasio Pulso', frecuencia: 'mensual', cliente_id: c3.id, acuerdo_id: a2.id });
  for (let m = 1; m <= hoy.getMonth() + 1; m++) {
    if (m % 2) mov(f(m, 14), 'gasto', 'Publicidad', 30000 + m * 2000, 'ARS', { descripcion: 'Anuncios Instagram' });
    if (m % 3 === 0) mov(f(m, 20), 'gasto', 'Otro', 12000, 'ARS', { descripcion: 'Café con cliente' });
    mov(f(m, 8), 'ingreso', 'Pago de proyecto', 200000 + m * 35000, 'ARS', { descripcion: 'Proyecto web' });
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
    const nueva = { ...fila, id: uid(), creado_por: yo.id, dueno_id: yo.id, creado_en: new Date().toISOString() };
    db[tabla].push(nueva);
    log(tabla, 'insert', nueva);
    return espera(nueva);
  }
  function borrar(tabla, id) {
    const fila = db[tabla].find((x) => x.id === id);
    const cli = tabla === 'clientes' ? fila : db.clientes.find((c) => c.id === fila?.cliente_id);
    const dueno = tabla === 'movimientos' ? fila?.dueno_id === yo.id : cli?.dueno_id === yo.id;
    if (yo.rol !== 'admin' && !dueno) return sinPermiso();
    db[tabla] = db[tabla].filter((x) => x.id !== id);
    log(tabla, 'delete', fila);
    return espera(null);
  }
  const movVisibles = () => db.movimientos.filter((m) => yo.rol === 'admin' || m.dueno_id === yo.id || (m.cliente_id && puedeVerId(m.cliente_id)));

  return {
    async sesion() { return logueado ? { user: { id: yo.id } } : null; },
    async iniciarSesion(email, pass) { if (!email || !pass) throw new Error('Mail o contraseña incorrectos.'); logueado = true; },
    async registrarse(nombre, email, pass) { if (!nombre || !email || !pass) throw new Error('Completá los campos obligatorios.'); yo.nombre = nombre; return { necesitaConfirmar: true }; },
    async estadoMfa() { return { nivel, factor: sessionStorage.getItem('demo-mfa') ? { id: 'f1' } : null }; },
    async inscribirMfa() { return { factorId: 'f1', qr: 'favicon.svg', secreto: 'DEMO-SECRETO-2FA' }; },
    async verificarMfa(_f, code) { if (!/^\d{6}$/.test(code)) throw new Error('El código no es válido o venció. Probá con el que aparece ahora en la app.'); sessionStorage.setItem('demo-mfa', '1'); nivel = 'aal2'; },
    async cerrarSesion() { logueado = false; nivel = 'aal1'; },
    alCambiarSesion() {},
    async perfil() { return nivel === 'aal2' ? yo : null; },
    async registrarIngreso() { log('sesion', 'ingreso', null); },
    async guardarPerfil(campos) {
      if (campos.usuario != null) {
        campos.usuario = String(campos.usuario).trim().replace(/^@/, '').toLowerCase() || null;
        if (campos.usuario && !/^[a-z0-9._]{3,30}$/.test(campos.usuario)) throw new Error('El @usuario va de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.');
        if (campos.usuario === 'tomado') throw new Error('Ese @usuario ya lo usa otra persona. Probá con otro.');
      }
      Object.assign(yo, campos);
      log('perfiles', 'update', yo);
      return espera(yo);
    },
    async subirImagenPerfil(_p, tipo, archivo) { const p = uid(); fotos.set(p, URL.createObjectURL(archivo)); return this.guardarPerfil({ [{ banner: 'banner_path', fondo: 'fondo_path' }[tipo] || 'foto_path']: p }); },
    urlImagenPerfil: async (p) => fotos.get(p) || null,

    listarClientes: () => espera(db.clientes.filter(puedeVer).map(conIds).sort((a, b) => a.nombre.localeCompare(b.nombre))),
    obtenerCliente: (id) => { const c = db.clientes.find((x) => x.id === id); return espera(puedeVer(c) ? conIds(c) : null); },
    async guardarCliente(c) {
      const { miembros_ids, ...fila } = c;
      const antes = fila.id && db.clientes.find((x) => x.id === fila.id);
      if (antes && !puedeVer(antes)) return sinPermiso();
      if (antes && fila.tipo && fila.tipo !== antes.tipo && antes.dueno_id !== yo.id && yo.rol !== 'admin') return sinPermiso();
      if (antes) delete fila.dueno_id; else fila.tipo ||= 'personal';
      const r = await guardar('clientes', fila);
      if (r.tipo === 'compartido' && !integrantes(r.id).some((m) => m.usuario_id === r.dueno_id)) db.miembros.push({ cliente_id: r.id, usuario_id: r.dueno_id, rol: 'dueno', creado_en: new Date().toISOString() });
      if (r.tipo === 'personal') db.miembros = db.miembros.filter((m) => m.cliente_id !== r.id || m.usuario_id === r.dueno_id);
      return conIds(r);
    },
    borrarCliente: (c) => borrar('clientes', c.id),
    async listarIntegrantes(cid) {
      const todos = [yo, ...otrosPerfiles()];
      return espera(integrantes(cid).map((m) => ({ ...(todos.find((p) => p.id === m.usuario_id) || { nombre: 'Cuenta' }), ...m })));
    },
    async agregarIntegrante(cid, buscado) {
      const c = db.clientes.find((x) => x.id === cid);
      if (c?.dueno_id !== yo.id && yo.rol !== 'admin') throw new Error('No tenés permiso para hacer esto.');
      if (c.tipo !== 'compartido') throw new Error('Primero convertí el cliente en compartido.');
      const b = String(buscado || '').trim().toLowerCase();
      if (!b) throw new Error('Escribí el @usuario o el mail.');
      const p = otrosPerfiles().find((x) => (b.indexOf('@') > 0 ? x.email === b : x.usuario === b.replace(/^@/, '')));
      if (!p) throw new Error('No encontramos ninguna cuenta con ese @usuario o mail.');
      if (yo.rol !== 'admin' && !amigosDemo(yo.id, p.id)) throw new Error('Solo podés sumar a tus amigos de la Red. Pedile su código de amigo primero.');
      if (integrantes(cid).some((m) => m.usuario_id === p.id)) throw new Error('Esa persona ya es integrante.');
      db.miembros.push({ cliente_id: cid, usuario_id: p.id, rol: 'integrante', creado_en: new Date().toISOString() });
      alFeed(cid, { tipo: 'integrante_entro', autor: yo.id, otro: p.id });
      return espera({ id: p.id, nombre: p.nombre, usuario: p.usuario });
    },
    async quitarIntegrante(cid, usuarioId) {
      const c = db.clientes.find((x) => x.id === cid);
      const m = integrantes(cid).find((x) => x.usuario_id === usuarioId);
      if (!m || m.rol === 'dueno' || !(usuarioId === yo.id || c.dueno_id === yo.id || yo.rol === 'admin')) return sinPermiso();
      db.miembros = db.miembros.filter((x) => x !== m);
      for (const t of db.tareas) if (t.cliente_id === cid && t.asignada_a === usuarioId && t.estado === 'pendiente') t.asignada_a = null;
      alFeed(cid, { tipo: 'integrante_salio', autor: yo.id, otro: usuarioId });
      return espera(null);
    },
    listarTareas: (cid) => espera(puedeVerId(cid) ? db.tareas.filter((t) => t.cliente_id === cid) : []),
    listarMisTareas: () => espera(db.tareas.filter((t) => t.asignada_a === yo.id && t.estado === 'pendiente' && puedeVerId(t.cliente_id))
      .map((t) => ({ ...t, clientes: { nombre: db.clientes.find((c) => c.id === t.cliente_id)?.nombre } }))),
    async guardarTarea(t) {
      const c = db.clientes.find((x) => x.id === (t.cliente_id || db.tareas.find((y) => y.id === t.id)?.cliente_id));
      if (!puedeVer(c)) return sinPermiso();
      if (c.tipo !== 'compartido') throw new Error('Las tareas son para clientes compartidos.');
      if (t.asignada_a && !integrantes(c.id).some((m) => m.usuario_id === t.asignada_a)) throw new Error('Solo se puede asignar a integrantes del cliente.');
      if (t.id) {
        const v = db.tareas.find((x) => x.id === t.id);
        const fila = v.estado === 'hecha' ? { ...t, importancia: v.importancia, asignada_a: v.asignada_a } : t;
        if (v.estado === 'pendiente' && fila.asignada_a && fila.asignada_a !== v.asignada_a) alFeed(c.id, { tipo: 'tarea_asignada', autor: yo.id, otro: fila.asignada_a, tarea_id: v.id, texto: fila.titulo || v.titulo, puntos: v.importancia });
        Object.assign(v, fila);
        return espera(v);
      }
      const nueva = { detalle: null, vence: null, asignada_a: null, ...t, id: uid(), estado: 'pendiente', completada_por: null, completada_en: null, creado_por: yo.id, creado_en: new Date().toISOString() };
      db.tareas.push(nueva);
      alFeed(c.id, { tipo: 'tarea_creada', autor: yo.id, otro: nueva.asignada_a, tarea_id: nueva.id, texto: nueva.titulo, puntos: nueva.importancia });
      return espera(nueva);
    },
    async completarTarea(id) {
      const t = db.tareas.find((x) => x.id === id);
      if (t.asignada_a && t.asignada_a !== yo.id) throw new Error('Esta tarea está asignada a otra persona: la tiene que completar ella.');
      Object.assign(t, { estado: 'hecha', completada_por: yo.id, completada_en: new Date().toISOString() });
      alFeed(t.cliente_id, { tipo: 'tarea_hecha', autor: yo.id, tarea_id: id, texto: t.titulo, puntos: t.importancia });
      return espera(t);
    },
    async reabrirTarea(id) {
      const t = db.tareas.find((x) => x.id === id);
      const c = db.clientes.find((x) => x.id === t.cliente_id);
      if (t.completada_por !== yo.id && c.dueno_id !== yo.id && yo.rol !== 'admin') throw new Error('Solo quien la completó o el dueño del cliente pueden reabrirla.');
      alFeed(t.cliente_id, { tipo: 'tarea_reabierta', autor: yo.id, otro: t.completada_por, tarea_id: id, texto: t.titulo, puntos: t.importancia });
      Object.assign(t, { estado: 'pendiente', completada_por: null, completada_en: null });
      return espera(t);
    },
    async borrarTarea(id) {
      const t = db.tareas.find((x) => x.id === id);
      const c = db.clientes.find((x) => x.id === t.cliente_id);
      if (!((t.creado_por === yo.id && t.estado === 'pendiente') || c.dueno_id === yo.id || yo.rol === 'admin')) return sinPermiso();
      db.tareas = db.tareas.filter((x) => x !== t);
      return espera(null);
    },
    listarRed: () => espera([yo, ...otrosPerfiles()].map((p) => ({ ...p, edad: p.id === yo.id ? null : p.edad, email: undefined, codigo: undefined })).sort((a, b) => a.nombre.localeCompare(b.nombre))),
    async miCodigoAmigo() { const p = perfilesDemo.find((x) => x.id === yo.id); return p ? p.codigo : (yo.codigo ||= 'VYTO-4DMZ'); },
    async renovarCodigoAmigo() { const c = 'NEW' + Math.floor(Math.random() * 9) + '-QZ7P'; const p = perfilesDemo.find((x) => x.id === yo.id); if (p) p.codigo = c; else yo.codigo = c; return c; },
    async perfilPorCodigo(cod) {
      const p = perfilesDemo.find((x) => x.codigo === String(cod || '').trim().toUpperCase());
      if (!p) throw new Error('Ese código de amigo no existe. Revisalo o pedile uno nuevo.');
      return { id: p.id, nombre: p.nombre, usuario: p.usuario, foto_path: p.foto_path, descripcion: p.descripcion };
    },
    async enviarSolicitud(cod) {
      const p = await this.perfilPorCodigo(cod);
      if (p.id === yo.id) throw new Error('Ese es tu propio código.');
      const ya = db.amistades.find((x) => (x.de === yo.id && x.para === p.id) || (x.de === p.id && x.para === yo.id));
      if (ya?.estado === 'aceptada') throw new Error('Ya son amigos.');
      if (ya && ya.de === yo.id) throw new Error('Ya le mandaste una solicitud. Falta que la acepte.');
      if (ya) { ya.estado = 'aceptada'; return 'aceptada'; }
      db.amistades.push({ id: uid(), de: yo.id, para: p.id, estado: 'pendiente', creado_en: new Date().toISOString() });
      return 'enviada';
    },
    async responderSolicitud(sid, aceptar) {
      const a = db.amistades.find((x) => x.id === sid && x.para === yo.id && x.estado === 'pendiente');
      if (!a) throw new Error('Esa solicitud ya no está.');
      if (aceptar) a.estado = 'aceptada'; else db.amistades = db.amistades.filter((x) => x !== a);
    },
    listarAmistades: () => espera(db.amistades.filter((x) => x.de === yo.id || x.para === yo.id)),
    async eliminarAmistad(id) { db.amistades = db.amistades.filter((x) => !(x.id === id && (x.de === yo.id || x.para === yo.id))); },
    listarMensajes: (otro) => espera(db.mensajes.filter((m) => (m.de === yo.id && m.para === otro) || (m.de === otro && m.para === yo.id)).sort((a, b) => a.creado_en.localeCompare(b.creado_en))),
    resumenMensajes: () => espera(db.mensajes.filter((m) => m.de === yo.id || m.para === yo.id).sort((a, b) => b.creado_en.localeCompare(a.creado_en))),
    async enviarMensaje(para, texto) {
      if (!amigosDemo(yo.id, para)) throw new Error('No tenés permiso para hacer esto.');
      const m = { id: uid(), de: yo.id, para, texto: texto.trim(), creado_en: new Date().toISOString(), leido_en: null };
      db.mensajes.push(m);
      // En el demo, el amigo contesta solo a los 2 segundos (para probar el tiempo real).
      setTimeout(() => {
        const r = { id: uid(), de: para, para: yo.id, texto: '¡Dale! Lo veo y te aviso 👍', creado_en: new Date().toISOString(), leido_en: null };
        db.mensajes.push(r);
        oyenteRed?.({ tipo: 'mensaje', fila: structuredClone(r) });
      }, 2000);
      return espera(m);
    },
    async marcarLeidos(otro) { for (const m of db.mensajes) if (m.para === yo.id && m.de === otro && !m.leido_en) m.leido_en = new Date().toISOString(); },
    async contarAvisosRed() {
      return { mensajes: db.mensajes.filter((m) => m.para === yo.id && !m.leido_en).length, solicitudes: db.amistades.filter((x) => x.para === yo.id && x.estado === 'pendiente').length };
    },
    async escucharRed(fn) { oyenteRed = fn; return () => { oyenteRed = null; }; },
    // IA de prueba: respuestas armadas, sin llamar a nadie.
    async ia(accion, d) {
      await new Promise((r) => setTimeout(r, 1200));
      iaUsados++;
      if (accion === 'redactar') {
        const c = db.clientes.find((x) => x.id === d.cliente_id);
        const n = (c?.contacto || 'che').split(' ')[0];
        return { restantes: 20 - iaUsados, resultado: {
          versiones: [
            { titulo: 'Corto y directo', texto: `Hola ${n}! ${d.pedido.replace(/\.$/, '')}. Cualquier cosa avisame 👍` },
            { titulo: 'Más cálido', texto: `Hola ${n}, ¿cómo va? Te escribo porque ${d.pedido.charAt(0).toLowerCase() + d.pedido.slice(1).replace(/\.$/, '')}. Si te queda más cómodo lo charlamos por audio. ¡Abrazo!` },
          ],
          consejo: c?.horarios ? `Según la ficha, conviene escribirle: ${c.horarios}.` : '',
        } };
      }
      const t = String(d.texto || '').toLowerCase();
      const num = Number((t.match(/[\d.,]+/) || ['0'])[0].replace(/\./g, '').replace(',', '.')) * (/lucas|\bk\b/.test(t) ? 1000 : 1);
      return { restantes: 20 - iaUsados, resultado: {
        tipo: /cobr|seña|pag[oó] el cliente/.test(t) ? 'ingreso' : 'gasto',
        descripcion: d.imagen ? 'Ticket (demo)' : (t.includes('artlist') ? 'Artlist Pro' : 'Gasto (demo)'),
        monto: d.imagen ? 18500 : (num || null), moneda: /usd|d[oó]lar|u\$s/.test(t) ? 'USD' : 'ARS',
        categoria: t.includes('artlist') ? 'Otro' : /claude|ia\b|chatgpt/.test(t) ? 'Herramienta IA' : 'Otro',
        frecuencia: /mensual|por mes|todos los meses/.test(t) ? 'mensual' : /anual|por año/.test(t) ? 'anual' : 'unico',
        fecha: null, medio_pago: null, dudas: d.imagen ? 'Es el modo demo: no se leyó la foto de verdad.' : '',
      } };
    },
    async iaMiUso() { return { usados: iaUsados, limite: 20, restantes: 20 - iaUsados }; },
    listarFeed: (cid) => espera(puedeVerId(cid) ? db.feed.filter((f) => f.cliente_id === cid).sort((a, b) => b.creado_en.localeCompare(a.creado_en)) : []),
    async subirFoto(c, archivo) { const p = uid(); fotos.set(p, URL.createObjectURL(archivo)); await guardar('clientes', { id: c.id, foto_path: p }); return p; },
    urlFoto: async (p) => fotos.get(p) || null,

    listarHistorial: (cid) => espera(db.historial.filter((h) => h.cliente_id === cid).sort((a, b) => b.fecha.localeCompare(a.fecha))),
    async guardarHistorial(h) { const r = await guardar('historial', h); if (!h.id) alFeed(h.cliente_id, { tipo: 'novedad', autor: yo.id, texto: h.texto.slice(0, 280) }); return r; },
    borrarHistorial: (id) => borrar('historial', id),
    listarAcuerdos: (cid) => espera(db.acuerdos.filter((a) => a.cliente_id === cid)),
    listarTodosAcuerdos: () => espera(db.acuerdos.filter((a) => puedeVerId(a.cliente_id))),
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
    listarPerfiles: () => espera([yo, ...otrosPerfiles()]),
    async copia() { return { generado: new Date().toISOString(), ...structuredClone(db) }; },
  };
}

export const datos = MODO_DEMO ? crearDemo() : (configurado ? crearSupabase() : null); // demo solo en localhost
