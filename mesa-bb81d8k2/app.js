// Panel Vectyo · interfaz. Todo el texto de los usuarios se pinta con textContent
// (nunca innerHTML), así nadie puede meter código en una ficha.
import { datos, MODO_DEMO } from './datos.js';

const cfg = window.VECTYO_CONFIG || {};
const $app = document.getElementById('app');
let yo = null;
const esAdmin = () => yo?.rol === 'admin';

// ------------------------------------------------------------------
// Constantes
// ------------------------------------------------------------------
const ETAPAS = [
  ['consulta', 'Consulta'], ['auditoria', 'Auditoría'], ['llamada', 'Llamada'], ['propuesta', 'Propuesta'],
  ['ganado', 'Ganado'], ['en-produccion', 'En producción'], ['entregado', 'Entregado'], ['perdido', 'Perdido'], ['frio', 'Frío'],
];
const nombreEtapa = (e) => (ETAPAS.find((x) => x[0] === e) || [e, e])[1];
const SERVICIOS = ['Páginas web', 'Marketing y redes', 'Automatización e IA', 'Branding y diseño'];
const CAT_GASTO = ['Software y suscripciones', 'Publicidad', 'Hosting y dominios', 'Impuestos y monotributo', 'Equipos', 'Honorarios y sueldos', 'Transporte', 'Capacitación', 'Varios'];
const CAT_INGRESO = ['Seña', 'Pago de proyecto', 'Abono mensual', 'Otro ingreso'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TIPO_ACUERDO = { proyecto: 'Proyecto (pago único)', mensual: 'Abono mensual', otro: 'Otro' };

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------
function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'href') el.setAttribute('href', enlaceSeguro(v));
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function enlaceSeguro(u) {
  const s = String(u).trim();
  if (s.startsWith('#') || /^https:\/\//i.test(s) || /^mailto:/i.test(s)) return s;
  if (/^http:\/\//i.test(s)) return s;
  return '#';
}
const svgNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...hijos) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const c of hijos.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const formatos = {};
function plata(n, moneda = 'ARS') {
  const k = moneda;
  formatos[k] ||= new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return formatos[k].format(Number(n) || 0);
}
const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
function hoyISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function fechaLinda(iso) { if (!iso) return ''; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; }
function iniciales(n) { return (n || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase(); }
function urlWhatsapp(num) {
  let d = String(num || '').replace(/\D/g, '');
  if (!d) return null;
  if (!d.startsWith('54')) d = '549' + d.replace(/^0/, '');
  return 'https://wa.me/' + d;
}
function urlInstagram(u) { const x = String(u || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, ''); return x ? 'https://instagram.com/' + encodeURIComponent(x) : null; }
function urlWeb(u) { const x = String(u || '').trim(); if (!x) return null; return /^https?:\/\//i.test(x) ? x : 'https://' + x; }
function aviso(msg, mal = false) {
  const box = document.getElementById('aviso');
  const d = h('div', { class: mal ? 'mal' : '', text: msg });
  box.replaceChildren(d);
  setTimeout(() => d.remove(), mal ? 6000 : 3000);
}
async function intentar(fn, ok) {
  try { const r = await fn(); if (ok) aviso(ok); return r; } catch (e) { console.error(e); aviso(e.message || 'Algo salió mal.', true); throw e; }
}
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = h('a', { download: nombre });
  a.href = url; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function sumar(lista) { return lista.reduce((t, x) => t + Number(x.monto || 0), 0); }

// ------------------------------------------------------------------
// Campos de formulario
// ------------------------------------------------------------------
const campo = (etiqueta, control, extra) => h('label', { class: 'campo' + (extra ? ' ' + extra : '') }, etiqueta, control);
const inp = (name, value, attrs = {}) => h('input', { name, value: value ?? '', ...attrs });
const area = (name, value, attrs = {}) => h('textarea', { name, ...attrs }, value ?? '');
function sel(name, opciones, valor, attrs = {}) {
  return h('select', { name, ...attrs }, opciones.map((o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    const op = h('option', { value: v, text: t });
    if (String(v) === String(valor ?? '')) op.selected = true;
    return op;
  }));
}

// Diálogo genérico: arma el formulario, llama a alGuardar(FormData) y se cierra si sale bien.
function dialogo({ titulo, cuerpo, textoGuardar = 'Guardar', alGuardar, peligro = false }) {
  return new Promise((resolver) => {
    const error = h('p', { class: 'error' });
    const guardar = h('button', { class: 'btn' + (peligro ? ' peligro' : ''), type: 'submit', text: textoGuardar });
    const form = h('form', { method: 'dialog', novalidate: true },
      h('h2', { text: titulo }), cuerpo, error,
      h('div', { class: 'acciones' },
        h('button', { class: 'btn sec', type: 'button', text: 'Cancelar', onclick: () => { dlg.close(); } }),
        guardar));
    const dlg = h('dialog', {}, form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      error.textContent = '';
      const req = [...form.querySelectorAll('[required]')].find((x) => !String(x.value).trim());
      if (req) { error.textContent = 'Completá los campos obligatorios.'; req.focus(); return; }
      guardar.disabled = true;
      try { const r = await alGuardar(new FormData(form), form); dlg.close(); resolver(r ?? true); }
      catch (e) { console.error(e); error.textContent = e.message || 'Algo salió mal.'; }
      finally { guardar.disabled = false; }
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolver(null); });
    document.body.append(dlg);
    dlg.showModal();
    const primero = form.querySelector('input:not([type=hidden]):not([type=checkbox]), textarea, select');
    if (primero && matchMedia('(min-width: 700px)').matches) primero.focus();
  });
}
const confirmar = (titulo, texto, boton = 'Sí, borrar') =>
  dialogo({ titulo, cuerpo: h('p', { class: 'suave', text: texto }), textoGuardar: boton, peligro: true, alGuardar: async () => true });

function elegirArchivo(accept, multiple = false) {
  return new Promise((resolver) => {
    const i = h('input', { type: 'file', accept, hidden: true, multiple });
    i.addEventListener('change', () => { resolver([...i.files]); i.remove(); });
    document.body.append(i);
    i.click();
  });
}

// ------------------------------------------------------------------
// Avatar con foto firmada
// ------------------------------------------------------------------
function avatar(c, grande = false) {
  const clase = 'avatar' + (grande ? ' grande' : '');
  const ini = h('div', { class: clase, text: iniciales(c.nombre), 'aria-hidden': 'true' });
  if (!c.foto_path) return ini;
  const img = h('img', { class: clase, alt: '', loading: 'lazy' });
  datos.urlFoto(c.foto_path).then((u) => { if (u) { img.src = u; ini.replaceWith(img); } }).catch(() => {});
  return ini;
}

// ------------------------------------------------------------------
// Arranque, login y 2 pasos
// ------------------------------------------------------------------
async function iniciar() {
  if (!datos) return pantallaSinConfigurar();
  try {
    const ses = await datos.sesion();
    if (!ses) return pantallaLogin();
    // La sesión sobrevive al cierre de la pestaña, pero se corta tras X horas sin uso.
    const ultimo = Number(localStorage.getItem('vy-ultimo') || 0);
    if (ultimo && Date.now() - ultimo > limiteInactividad()) return salir('Se cerró la sesión por inactividad.');
    marcarActividad();
    const mfa = await datos.estadoMfa();
    if (mfa.nivel !== 'aal2') return pantallaMfa(mfa);
    yo = await datos.perfil();
    if (!yo) return pantallaSinPermiso();
    if (!sessionStorage.getItem('vy-ingreso')) { sessionStorage.setItem('vy-ingreso', '1'); datos.registrarIngreso().catch(() => {}); }
    vigilarInactividad();
    armarMarco();
    ruta();
  } catch (e) {
    console.error(e);
    pantallaLogin(e.message);
  }
}

function caja(...hijos) {
  return h('div', { class: 'login' }, h('div', { class: 'panel' }, h('img', { class: 'logo', src: 'isotipo.svg', alt: 'Vectyo' }), ...hijos));
}

function pantallaSinConfigurar() {
  $app.replaceChildren(caja(h('h1', { text: 'Falta configurar' }),
    h('p', { class: 'suave', text: 'Este panel todavía no está conectado a la base de datos. Seguí los pasos de INSTALACION.md.' })));
}

function pantallaLogin(msg) {
  const error = h('p', { class: 'error', text: msg || '' });
  const btn = h('button', { class: 'btn ancho', type: 'submit', text: 'Entrar' });
  const form = h('form', {},
    campo('Mail', inp('email', '', { type: 'email', autocomplete: 'username', required: true, inputmode: 'email' })),
    campo('Contraseña', inp('password', '', { type: 'password', autocomplete: 'current-password', required: true })),
    error, btn);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    btn.disabled = true; error.textContent = '';
    try { await datos.iniciarSesion(String(fd.get('email')).trim(), String(fd.get('password'))); await iniciar(); }
    catch (e) { error.textContent = e.message; btn.disabled = false; }
  });
  $app.replaceChildren(caja(h('h1', { text: 'Panel Vectyo' }), h('p', { class: 'suave', text: 'Entrá con tu mail y contraseña.' }), form));
}

async function pantallaMfa(mfa) {
  const error = h('p', { class: 'error' });
  const codigo = inp('code', '', { class: 'codigo', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]*', maxlength: 6, required: true, 'aria-label': 'Código de 6 números' });
  const btn = h('button', { class: 'btn ancho', type: 'submit', text: 'Confirmar' });
  const salir = h('button', { class: 'btn sec ancho', type: 'button', text: 'Volver', onclick: async () => { await datos.cerrarSesion(); pantallaLogin(); } });
  let factorId = mfa.factor?.id;
  const partes = [];
  if (factorId) {
    partes.push(h('h1', { text: 'Código de seguridad' }),
      h('p', { class: 'suave', text: 'Abrí Google Authenticator en tu celular y escribí el código de 6 números de "Panel Vectyo".' }));
  } else {
    $app.replaceChildren(caja(h('p', { class: 'suave', text: 'Preparando…' })));
    let ins;
    try { ins = await datos.inscribirMfa(); } catch (e) { return pantallaLogin(e.message); }
    factorId = ins.factorId;
    partes.push(h('h1', { text: 'Activá el código de seguridad' }),
      h('p', { class: 'suave', text: 'Se hace una sola vez. Desde ahora, además de la contraseña, vas a necesitar un código que cambia cada 30 segundos en tu celular.' }),
      h('ol', { class: 'chico' },
        h('li', { text: 'Instalá "Google Authenticator" en el celular (Play Store o App Store).' }),
        h('li', { text: 'Tocá el "+" y elegí "Escanear código QR". Apuntá a este cuadro:' })),
      h('img', { class: 'qr', src: ins.qr, alt: 'Código QR para Google Authenticator' }),
      h('p', { class: 'chico suave', text: '¿Estás en el celular y no podés escanear? En la app elegí "Ingresar clave de configuración" y copiá esta:' }),
      h('p', { class: 'secreto', text: ins.secreto }),
      h('ol', { class: 'chico', start: 3 }, h('li', { text: 'Escribí acá abajo el código de 6 números que muestra la app.' })));
  }
  const form = h('form', {}, codigo, error, btn, salir);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    btn.disabled = true; error.textContent = '';
    try { await datos.verificarMfa(factorId, codigo.value.replace(/\D/g, '')); await iniciar(); }
    catch (e) { error.textContent = e.message; btn.disabled = false; codigo.select(); }
  });
  $app.replaceChildren(caja(...partes, form));
  codigo.focus();
}

function pantallaSinPermiso() {
  $app.replaceChildren(caja(h('h1', { text: 'Sin acceso' }),
    h('p', { class: 'suave', text: 'Tu usuario existe pero no tiene permiso para ver el panel. Pedíselo a Luciano.' }),
    h('button', { class: 'btn sec ancho', text: 'Salir', onclick: salir })));
}

async function salir(msg) {
  try { await datos.cerrarSesion(); } catch { /* igual salimos */ }
  sessionStorage.clear();
  localStorage.removeItem('vy-ultimo');
  yo = null;
  pantallaLogin(typeof msg === 'string' ? msg : '');
  history.replaceState(null, '', location.pathname + location.search);
}

const limiteInactividad = () => (cfg.minutosInactividad || 480) * 60000;
let ultimaMarca = 0;
function marcarActividad() {
  const ahora = Date.now();
  if (ahora - ultimaMarca < 15000) return; // no escribir a cada movimiento
  ultimaMarca = ahora;
  localStorage.setItem('vy-ultimo', String(ahora));
}
let vigilando = false;
function vigilarInactividad() {
  if (vigilando) return;
  vigilando = true;
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, marcarActividad, { passive: true });
  setInterval(() => {
    const ultimo = Number(localStorage.getItem('vy-ultimo') || Date.now());
    if (yo && Date.now() - ultimo > limiteInactividad()) salir('Se cerró la sesión por inactividad.');
  }, 60000);
}

// ------------------------------------------------------------------
// Marco y rutas
// ------------------------------------------------------------------
let $main;
function armarMarco() {
  const links = [['#/clientes', 'Clientes'], ['#/plata', esAdmin() ? 'Ingresos y gastos' : 'Cargar plata']];
  if (esAdmin()) links.push(['#/analytics', 'Analytics'], ['#/registro', 'Registro y copias']);
  const nav = h('nav', { class: 'nav', 'aria-label': 'Secciones' }, links.map(([href, t]) => h('a', { href, text: t })));
  $main = h('main', { id: 'contenido' });
  $app.replaceChildren(
    h('header', { class: 'barra' },
      h('a', { class: 'marca', href: '#/clientes' }, h('img', { src: 'isotipo.svg', alt: '' }), 'VECTYO'),
      nav,
      h('div', { class: 'usuario' }, h('span', { class: 'quien suave chico', text: yo.nombre }), h('button', { class: 'btn sec mini', text: 'Salir', onclick: () => salir() }))),
    MODO_DEMO ? h('div', { class: 'demo', text: 'Modo demo: datos inventados, solo en esta compu. Nada se guarda.' }) : null,
    $main);
}
function marcarNav() {
  const actual = '#/' + (location.hash.split('/')[1] || 'clientes');
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', false));
  const a = [...document.querySelectorAll('.nav a')].find((x) => x.getAttribute('href') === (actual === '#/cliente' ? '#/clientes' : actual));
  if (a) a.setAttribute('aria-current', 'page');
}
async function ruta() {
  if (!yo || !$main) return;
  const [, seccion, id] = location.hash.split('/');
  marcarNav();
  $main.replaceChildren(h('p', { class: 'cargando', text: 'Cargando…' }));
  try {
    if (seccion === 'cliente' && id) await vistaFicha(decodeURIComponent(id));
    else if (seccion === 'plata') await vistaPlata();
    else if (seccion === 'analytics' && esAdmin()) await vistaAnalytics();
    else if (seccion === 'registro' && esAdmin()) await vistaRegistro();
    else await vistaClientes();
  } catch (e) {
    console.error(e);
    $main.replaceChildren(h('div', { class: 'panel' }, h('p', { class: 'error', text: e.message || 'No se pudo cargar.' })));
  }
  window.scrollTo(0, 0);
}
addEventListener('hashchange', ruta);

// ------------------------------------------------------------------
// Clientes
// ------------------------------------------------------------------
async function vistaClientes() {
  const clientes = await datos.listarClientes();
  const buscar = inp('q', '', { type: 'search', placeholder: 'Buscar por nombre, rubro o ciudad', 'aria-label': 'Buscar' });
  const etapa = sel('etapa', [['', 'Todas las etapas'], ...ETAPAS], '', { 'aria-label': 'Etapa' });
  const grilla = h('div', { class: 'tarjetas' });
  function pintar() {
    const q = buscar.value.trim().toLowerCase();
    const lista = clientes.filter((c) => (!etapa.value || c.etapa === etapa.value) &&
      (!q || [c.nombre, c.rubro, c.ciudad, c.contacto].join(' ').toLowerCase().includes(q)));
    grilla.replaceChildren(...lista.map((c) => h('a', { class: 'tarjeta', href: '#/cliente/' + encodeURIComponent(c.id) },
      avatar(c), h('span', { class: 'nombre', text: c.nombre }), h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }))));
    if (!lista.length) grilla.replaceChildren(h('p', { class: 'vacio', text: clientes.length ? 'No hay clientes con ese filtro.' : 'Todavía no hay clientes. Tocá "Nuevo cliente".' }));
  }
  buscar.addEventListener('input', pintar);
  etapa.addEventListener('change', pintar);
  pintar();
  $main.replaceChildren(
    h('div', { class: 'encabezado' }, h('h1', { text: 'Clientes' }), h('span', { class: 'suave chico', text: clientes.length + ' en total' }),
      h('button', { class: 'btn', text: '+ Nuevo cliente', onclick: async () => { const c = await formCliente(); if (c) location.hash = '#/cliente/' + c.id; } })),
    h('div', { class: 'filtros' }, buscar, etapa),
    grilla);
}

function formCliente(c = {}) {
  const servs = new Set(c.servicios || []);
  const extras = [...servs].filter((x) => !SERVICIOS.includes(x));
  const cuerpo = h('div', { class: 'grilla-form' },
    campo('Nombre del negocio *', inp('nombre', c.nombre, { required: true, maxlength: 200 }), 'entera'),
    campo('Persona de contacto', inp('contacto', c.contacto)),
    campo('WhatsApp', inp('whatsapp', c.whatsapp, { inputmode: 'tel', placeholder: 'Ej: 2664639451' })),
    campo('Mail', inp('email', c.email, { type: 'email', inputmode: 'email' })),
    campo('Instagram', inp('instagram', c.instagram, { placeholder: '@usuario' })),
    campo('Web', inp('web', c.web, { placeholder: 'ejemplo.com' })),
    campo('Rubro', inp('rubro', c.rubro)),
    campo('Ciudad', inp('ciudad', c.ciudad)),
    campo('Cómo nos conoció', inp('origen', c.origen)),
    campo('Etapa', sel('etapa', ETAPAS, c.etapa || 'consulta')),
    campo('Responsable', sel('responsable', ['Luciano', 'Juan'], c.responsable || yo.nombre.split(' ')[0])),
    h('fieldset', { class: 'entera campo' }, h('legend', { class: 'suave chico', text: 'Servicios' }),
      h('div', { class: 'grilla-form' }, [...SERVICIOS, ...extras].map((sv) => h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'servicios', value: sv, checked: servs.has(sv) }), sv)))),
    campo('Próxima acción', inp('proxima_accion', c.proxima_accion, { placeholder: 'Qué hay que hacer' })),
    campo('Fecha de la próxima acción', inp('fecha_proxima_accion', c.fecha_proxima_accion, { type: 'date' })),
    h('h3', { class: 'entera', text: 'Cómo es y cómo le gusta trabajar' }),
    campo('Personalidad', area('personalidad', c.personalidad, { placeholder: 'Ej: detallista, decide rápido, le importa el precio…' }), 'entera'),
    campo('Forma de trabajar que le gusta', area('forma_trabajo', c.forma_trabajo, { placeholder: 'Ej: prefiere audios, reuniones cortas, todo por escrito…' }), 'entera'),
    campo('Canal preferido', inp('canal_preferido', c.canal_preferido, { placeholder: 'WhatsApp, mail, llamada…' })),
    campo('Horarios', inp('horarios', c.horarios, { placeholder: 'Cuándo conviene escribirle' })),
    campo('Cosas a evitar', area('evitar', c.evitar), 'entera'),
    campo('Notas', area('notas', c.notas), 'entera'));
  return dialogo({
    titulo: c.id ? 'Editar cliente' : 'Nuevo cliente',
    cuerpo,
    alGuardar: async (fd) => {
      const fila = { servicios: fd.getAll('servicios') };
      for (const k of ['nombre', 'contacto', 'whatsapp', 'email', 'instagram', 'web', 'rubro', 'ciudad', 'origen', 'etapa', 'responsable', 'proxima_accion', 'fecha_proxima_accion', 'personalidad', 'forma_trabajo', 'canal_preferido', 'horarios', 'evitar', 'notas']) {
        const v = String(fd.get(k) ?? '').trim();
        fila[k] = v || null;
      }
      if (c.id) fila.id = c.id;
      const r = await datos.guardarCliente(fila);
      aviso('Cliente guardado.');
      return r;
    },
  });
}

async function vistaFicha(id) {
  const [c, historial, acuerdos, movs, archivos] = await Promise.all([
    datos.obtenerCliente(id), datos.listarHistorial(id), datos.listarAcuerdos(id),
    datos.listarMovimientos({ clienteId: id }), datos.listarArchivos(id),
  ]);
  if (!c) throw new Error('No se encontró ese cliente.');
  const recargar = () => ruta();

  // Cabecera
  const fotoBox = h('div', { class: 'foto-cambiar' }, avatar(c, true),
    h('button', { class: 'btn sec', text: 'Foto', 'aria-label': 'Cambiar foto', onclick: async () => {
      const [f] = await elegirArchivo('image/jpeg,image/png,image/webp');
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return aviso('La foto pesa más de 5 MB. Probá con una más chica.', true);
      await intentar(() => datos.subirFoto(c, f), 'Foto actualizada.');
      recargar();
    } }));
  const links = [
    urlWhatsapp(c.whatsapp) && h('a', { class: 'btn mini', href: urlWhatsapp(c.whatsapp), target: '_blank', rel: 'noopener noreferrer', text: 'WhatsApp' }),
    urlInstagram(c.instagram) && h('a', { class: 'btn sec mini', href: urlInstagram(c.instagram), target: '_blank', rel: 'noopener noreferrer', text: 'Instagram' }),
    urlWeb(c.web) && h('a', { class: 'btn sec mini', href: urlWeb(c.web), target: '_blank', rel: 'noopener noreferrer', text: 'Web' }),
    c.email && h('a', { class: 'btn sec mini', href: 'mailto:' + c.email, text: 'Mail' }),
  ];
  const cab = h('div', { class: 'ficha-cab' }, fotoBox,
    h('div', { class: 'info' },
      h('h1', { text: c.nombre }),
      h('div', {}, h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }), ' ',
        (c.servicios || []).map((sv) => [h('span', { class: 'chip', text: sv }), ' '])),
      h('div', { class: 'botones' }, links,
        h('button', { class: 'btn sec mini', text: 'Editar', onclick: async () => { if (await formCliente(c)) recargar(); } }),
        esAdmin() && h('button', { class: 'btn peligro mini', text: 'Borrar', onclick: async () => {
          if (!await confirmar('¿Borrar ' + c.nombre + '?', 'Se borra la ficha con su historial, tratos y PDF. Los pagos quedan en Ingresos y gastos, sin cliente. No se puede deshacer.')) return;
          await intentar(() => datos.borrarCliente(c), 'Cliente borrado.');
          location.hash = '#/clientes';
        } }))));

  // Personalidad
  const bloque = (t, v) => h('div', { class: 'bloque' }, h('h3', { text: t }), h('p', { class: 'texto-largo' + (v ? '' : ' suave'), text: v || 'Sin cargar.' }));
  const pPersona = h('section', { class: 'panel' }, h('h2', { text: 'Cómo es y cómo le gusta trabajar' }),
    bloque('Personalidad', c.personalidad), bloque('Forma de trabajar que le gusta', c.forma_trabajo),
    bloque('Canal preferido', c.canal_preferido), bloque('Horarios', c.horarios), bloque('Cosas a evitar', c.evitar));

  // Datos
  const vencida = c.fecha_proxima_accion && c.fecha_proxima_accion < hoyISO();
  const fila = (k, v) => v ? [h('dt', { text: k }), h('dd', {}, v)] : null;
  const pDatos = h('section', { class: 'panel' }, h('h2', { text: 'Datos y seguimiento' }),
    h('dl', { class: 'datos' },
      fila('Contacto', c.contacto), fila('WhatsApp', c.whatsapp), fila('Mail', c.email), fila('Instagram', c.instagram), fila('Web', c.web),
      fila('Rubro', c.rubro), fila('Ciudad', c.ciudad), fila('Nos conoció por', c.origen), fila('Responsable', c.responsable),
      fila('Próxima acción', c.proxima_accion ? [c.proxima_accion, c.fecha_proxima_accion ? h('span', { class: vencida ? 'debe' : 'suave', text: ' · ' + fechaLinda(c.fecha_proxima_accion) + (vencida ? ' (vencida)' : '') }) : null] : null),
      fila('Alta', fechaLinda(c.creado_en))));

  // Tratos económicos
  const ingresos = movs.filter((m) => m.tipo === 'ingreso');
  const totales = {};
  const filasAcuerdo = acuerdos.map((a) => {
    const cobrado = sumar(ingresos.filter((m) => m.acuerdo_id === a.id && m.moneda === a.moneda));
    const saldo = a.tipo === 'mensual' ? null : Math.max(0, Number(a.monto) - cobrado);
    if (a.estado !== 'cancelado' && a.tipo !== 'mensual') {
      const t = (totales[a.moneda] ||= { acordado: 0, cobrado: 0, debe: 0 });
      t.acordado += Number(a.monto); t.cobrado += cobrado; t.debe += saldo;
    }
    let detalle;
    if (a.tipo === 'mensual') {
      const mes = hoyISO().slice(0, 7);
      const esteMes = sumar(ingresos.filter((m) => m.acuerdo_id === a.id && m.fecha.startsWith(mes)));
      detalle = h('span', { class: esteMes >= Number(a.monto) ? 'al-dia' : 'debe', text: esteMes >= Number(a.monto) ? 'Mes actual cobrado' : 'Mes actual sin cobrar' + (esteMes ? ' completo (' + plata(esteMes, a.moneda) + ')' : '') });
    } else {
      detalle = h('span', { class: saldo > 0 ? 'debe' : 'al-dia', text: saldo > 0 ? 'Debe ' + plata(saldo, a.moneda) : 'Pagado completo' });
    }
    return h('li', {},
      h('div', { class: 'cuerpo' },
        h('p', {}, h('strong', { text: a.concepto }), ' · ', plata(a.monto, a.moneda), a.tipo === 'mensual' ? ' por mes' : ''),
        h('p', { class: 'chico suave', text: [TIPO_ACUERDO[a.tipo], 'desde ' + fechaLinda(a.fecha), a.estado !== 'vigente' ? a.estado : null, a.condiciones].filter(Boolean).join(' · ') }),
        h('p', { class: 'chico' }, 'Cobrado ' + plata(cobrado, a.moneda) + ' · ', detalle)),
      h('button', { class: 'btn sec mini', text: 'Editar', onclick: async () => { if (await formAcuerdo(c, a)) recargar(); } }),
      esAdmin() && h('button', { class: 'btn peligro mini', text: 'Borrar', 'aria-label': 'Borrar trato', onclick: async () => {
        if (!await confirmar('¿Borrar el trato?', 'Se borra "' + a.concepto + '". Los pagos ya cargados quedan.')) return;
        await intentar(() => datos.borrarAcuerdo(a.id), 'Trato borrado.'); recargar();
      } }));
  });
  const resumen = Object.entries(totales).map(([mon, t]) => h('div', { class: 'saldo' },
    h('div', {}, h('span', { text: 'Acordado (' + mon + ')' }), h('strong', { text: plata(t.acordado, mon) })),
    h('div', {}, h('span', { text: 'Cobrado' }), h('strong', { text: plata(t.cobrado, mon) })),
    h('div', {}, h('span', { text: 'Debe' }), h('strong', { class: t.debe > 0 ? 'debe' : 'al-dia', text: plata(t.debe, mon) }))));
  const pPlata = h('section', { class: 'panel' },
    h('h2', {}, 'Tratos económicos', h('button', { class: 'btn mini', text: '+ Trato', onclick: async () => { if (await formAcuerdo(c)) recargar(); } })),
    resumen,
    acuerdos.length ? h('ul', { class: 'lista' }, filasAcuerdo) : h('p', { class: 'suave', text: 'Todavía no hay tratos. Cargá lo que acordaron: monto, si es pago único o abono mensual y las condiciones (seña, cuotas).' }),
    h('h3', { class: 'bloque', text: 'Pagos recibidos' }),
    h('div', { class: 'acciones' }, h('button', { class: 'btn mini', text: '+ Pago recibido', onclick: async () => { if (await formMovimiento({ tipo: 'ingreso', cliente_id: c.id }, { cliente: c, acuerdos })) recargar(); } })),
    ingresos.length ? h('ul', { class: 'lista' }, ingresos.map((m) => h('li', {},
      h('span', { class: 'fecha', text: fechaLinda(m.fecha) }),
      h('div', { class: 'cuerpo' }, h('p', {}, h('strong', { text: plata(m.monto, m.moneda) }), ' · ' + m.categoria), m.descripcion ? h('p', { class: 'chico suave', text: m.descripcion }) : null)))) :
      h('p', { class: 'suave chico', text: 'Sin pagos cargados.' }));

  // Archivos
  const pArchivos = h('section', { class: 'panel' },
    h('h2', {}, 'Archivos PDF', h('button', { class: 'btn mini', text: 'Subir PDF', onclick: async () => {
      const fs = await elegirArchivo('application/pdf', true);
      for (const f of fs) {
        if (f.size > 25 * 1024 * 1024) { aviso(f.name + ' pesa más de 25 MB.', true); continue; }
        await intentar(() => datos.subirArchivo(c.id, f), 'Subido: ' + f.name).catch(() => {});
      }
      if (fs.length) recargar();
    } })),
    archivos.length ? h('ul', { class: 'lista' }, archivos.map((a) => h('li', {},
      h('div', { class: 'cuerpo' }, h('p', { text: a.nombre }), h('p', { class: 'chico suave', text: fechaLinda(a.creado_en) + (a.tamano ? ' · ' + (a.tamano / 1048576).toFixed(1) + ' MB' : '') })),
      h('button', { class: 'btn sec mini', text: 'Abrir', onclick: async () => {
        const w = window.open('', '_blank');
        try { const u = await datos.urlArchivo(a.path); if (w) { w.opener = null; w.location.href = u; } else location.href = u; }
        catch (e) { if (w) w.close(); aviso(e.message, true); }
      } }),
      esAdmin() && h('button', { class: 'btn peligro mini', text: 'Borrar', 'aria-label': 'Borrar ' + a.nombre, onclick: async () => {
        if (!await confirmar('¿Borrar el PDF?', 'Se borra "' + a.nombre + '" del panel. No se puede deshacer.')) return;
        await intentar(() => datos.borrarArchivo(a), 'PDF borrado.'); recargar();
      } })))) :
      h('p', { class: 'suave', text: 'Sin archivos. Subí propuestas, contratos, briefs o facturas en PDF (hasta 25 MB).' }));

  // Historial
  const texto = area('texto', '', { placeholder: 'Qué pasó (ej: le mandé la propuesta por WhatsApp)', required: true, rows: 2 });
  const fechaH = inp('fecha', hoyISO(), { type: 'date', required: true });
  const formH = h('form', { class: 'grilla-form' }, campo('Novedad', texto, 'entera'), campo('Fecha', fechaH),
    h('div', { class: 'acciones' }, h('button', { class: 'btn mini', type: 'submit', text: 'Agregar al historial' })));
  formH.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!texto.value.trim()) return texto.focus();
    await intentar(() => datos.guardarHistorial({ cliente_id: c.id, fecha: fechaH.value || hoyISO(), texto: texto.value.trim() }), 'Agregado al historial.');
    recargar();
  });
  const pHistorial = h('section', { class: 'panel' }, h('h2', { text: 'Historial' }), formH,
    historial.length ? h('ul', { class: 'lista bloque' }, historial.map((x) => h('li', {},
      h('span', { class: 'fecha', text: fechaLinda(x.fecha) }), h('div', { class: 'cuerpo' }, h('p', { class: 'texto-largo', text: x.texto })),
      esAdmin() && h('button', { class: 'btn peligro mini', text: '×', 'aria-label': 'Borrar entrada', onclick: async () => {
        if (!await confirmar('¿Borrar esta entrada?', x.texto.slice(0, 140))) return;
        await intentar(() => datos.borrarHistorial(x.id)); recargar();
      } })))) : h('p', { class: 'suave bloque', text: 'Sin novedades cargadas.' }));

  const pNotas = c.notas ? h('section', { class: 'panel' }, h('h2', { text: 'Notas' }), h('p', { class: 'texto-largo', text: c.notas })) : null;

  $main.replaceChildren(
    h('p', { class: 'chico' }, h('a', { href: '#/clientes', text: '← Todos los clientes' })),
    cab,
    h('div', { class: 'ficha-grilla' }, pPersona, pDatos, pPlata, pArchivos, pHistorial, pNotas));
}

function formAcuerdo(c, a = {}) {
  return dialogo({
    titulo: a.id ? 'Editar trato' : 'Nuevo trato con ' + c.nombre,
    cuerpo: h('div', { class: 'grilla-form' },
      campo('Concepto *', inp('concepto', a.concepto, { required: true, placeholder: 'Ej: Web institucional' }), 'entera'),
      campo('Tipo', sel('tipo', Object.entries(TIPO_ACUERDO), a.tipo || 'proyecto')),
      campo('Monto total (o por mes) *', inp('monto', a.monto, { type: 'number', min: 0, step: '0.01', inputmode: 'decimal', required: true })),
      campo('Moneda', sel('moneda', ['ARS', 'USD'], a.moneda || 'ARS')),
      campo('Fecha del acuerdo', inp('fecha', a.fecha || hoyISO(), { type: 'date' })),
      campo('Estado', sel('estado', [['vigente', 'Vigente'], ['terminado', 'Terminado'], ['cancelado', 'Cancelado']], a.estado || 'vigente')),
      campo('Condiciones', area('condiciones', a.condiciones, { placeholder: 'Ej: 50% de seña y 50% contra entrega. Cobro del 1 al 10.' }), 'entera')),
    alGuardar: async (fd) => {
      const monto = Number(fd.get('monto'));
      if (!(monto >= 0)) throw new Error('El monto tiene que ser un número.');
      await datos.guardarAcuerdo({ ...(a.id ? { id: a.id } : { cliente_id: c.id }), concepto: String(fd.get('concepto')).trim(), tipo: fd.get('tipo'), monto, moneda: fd.get('moneda'), fecha: fd.get('fecha') || hoyISO(), estado: fd.get('estado'), condiciones: String(fd.get('condiciones')).trim() || null });
      aviso('Trato guardado.');
    },
  });
}

// ------------------------------------------------------------------
// Ingresos y gastos
// ------------------------------------------------------------------
async function formMovimiento(m = {}, { cliente, acuerdos, clientes } = {}) {
  const tipo = sel('tipo', [['ingreso', 'Ingreso (entró plata)'], ['gasto', 'Gasto (salió plata)']], m.tipo || 'gasto');
  const categoria = sel('categoria', [], '');
  const pintarCat = () => {
    const lista = tipo.value === 'ingreso' ? CAT_INGRESO : CAT_GASTO;
    const opciones = m.categoria && !lista.includes(m.categoria) ? [...lista, m.categoria] : lista;
    categoria.replaceChildren(...opciones.map((o) => { const op = h('option', { value: o, text: o }); if (o === m.categoria) op.selected = true; return op; }));
  };
  pintarCat();
  const fijoBox = h('label', { class: 'check entera' }, h('input', { type: 'checkbox', name: 'fijo', checked: m.fijo }), 'Es un gasto fijo que se repite todos los meses');
  const moneda = sel('moneda', ['ARS', 'USD'], m.moneda || 'ARS');
  const acuerdoSel = acuerdos?.length ? sel('acuerdo_id', [['', 'Sin trato asociado'], ...acuerdos.filter((a) => a.estado !== 'cancelado').map((a) => [a.id, a.concepto + ' (' + a.moneda + ')'])], m.acuerdo_id || (acuerdos.find((a) => a.estado === 'vigente')?.id ?? '')) : null;
  if (acuerdoSel) {
    const sync = () => { const a = acuerdos.find((x) => x.id === acuerdoSel.value); if (a) moneda.value = a.moneda; };
    acuerdoSel.addEventListener('change', sync);
    if (!m.id) sync();
  }
  let clienteSel = null;
  if (!cliente) {
    const cl = clientes || await datos.listarClientes();
    clienteSel = sel('cliente_id', [['', 'Ninguno'], ...cl.map((x) => [x.id, x.nombre])], m.cliente_id || '');
  }
  const actualizar = () => { pintarCat(); fijoBox.hidden = tipo.value !== 'gasto'; };
  tipo.addEventListener('change', actualizar);
  actualizar();
  return dialogo({
    titulo: m.id ? 'Editar movimiento' : cliente ? 'Pago recibido de ' + cliente.nombre : (m.tipo === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'),
    cuerpo: h('div', { class: 'grilla-form' },
      cliente ? h('input', { type: 'hidden', name: 'tipo', value: 'ingreso' }) : campo('Tipo', tipo),
      campo('Monto *', inp('monto', m.monto, { type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal', required: true })),
      campo('Moneda', moneda),
      campo('Fecha', inp('fecha', m.fecha || hoyISO(), { type: 'date', required: true })),
      campo('Categoría', categoria),
      acuerdoSel ? campo('Corresponde al trato', acuerdoSel) : null,
      clienteSel ? campo('Cliente (si corresponde)', clienteSel) : null,
      campo('Medio de pago', inp('medio_pago', m.medio_pago, { placeholder: 'Transferencia, efectivo, Mercado Pago…' })),
      campo('Detalle', inp('descripcion', m.descripcion, { placeholder: 'Ej: Artlist Pro, anuncios de noviembre' }), 'entera'),
      cliente ? null : fijoBox),
    alGuardar: async (fd) => {
      const monto = Number(fd.get('monto'));
      if (!(monto > 0)) throw new Error('El monto tiene que ser mayor a cero.');
      const t = cliente ? 'ingreso' : fd.get('tipo');
      const fila = {
        tipo: t, monto, moneda: fd.get('moneda'), fecha: fd.get('fecha') || hoyISO(), categoria: fd.get('categoria'),
        medio_pago: String(fd.get('medio_pago') || '').trim() || null, descripcion: String(fd.get('descripcion') || '').trim() || null,
        cliente_id: cliente ? cliente.id : (fd.get('cliente_id') || null),
        acuerdo_id: fd.get('acuerdo_id') || (cliente ? null : m.acuerdo_id || null),
        fijo: t === 'gasto' && fd.get('fijo') === 'on',
      };
      if (!cliente && fila.cliente_id !== m.cliente_id) fila.acuerdo_id = null;
      if (m.id) fila.id = m.id;
      await datos.guardarMovimiento(fila);
      aviso(t === 'ingreso' ? 'Ingreso guardado.' : 'Gasto guardado.');
    },
  });
}

async function vistaPlata() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const mesActual = hoyISO().slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(params.get('mes') || '') ? params.get('mes') : mesActual;
  const [a, m] = mes.split('-').map(Number);
  const desde = `${mes}-01`;
  const hasta = `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`;
  const [movs, clientes] = await Promise.all([datos.listarMovimientos({ desde, hasta }), datos.listarClientes()]);
  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]));

  const selMes = inp('mes', mes, { type: 'month', 'aria-label': 'Mes' });
  selMes.addEventListener('change', () => { if (selMes.value) location.hash = '#/plata?mes=' + selMes.value; });
  const selTipo = sel('tipo', [['', 'Ingresos y gastos'], ['ingreso', 'Solo ingresos'], ['gasto', 'Solo gastos']], '', { 'aria-label': 'Tipo' });
  const cuerpoTabla = h('tbody');
  const pie = h('tfoot');
  const puedeEditar = (x) => esAdmin() || x.creado_por === yo.id;

  function pintar() {
    const lista = movs.filter((x) => !selTipo.value || x.tipo === selTipo.value);
    cuerpoTabla.replaceChildren(...lista.map((x) => h('tr', {},
      h('td', { class: 'mono chico', text: fechaLinda(x.fecha) }),
      h('td', {}, h('span', { class: 'chip', text: x.tipo === 'ingreso' ? 'Ingreso' : x.fijo ? 'Gasto fijo' : 'Gasto' })),
      h('td', { text: x.categoria }),
      h('td', {}, x.descripcion || '', x.cliente_id ? h('span', { class: 'suave chico', text: (x.descripcion ? ' · ' : '') + (nombres[x.cliente_id] || 'cliente') }) : ''),
      h('td', { class: 'num ' + (x.tipo === 'ingreso' ? 'pos' : 'neg'), text: (x.tipo === 'ingreso' ? '+ ' : '− ') + plata(x.monto, x.moneda) }),
      h('td', { class: 'num' },
        puedeEditar(x) ? h('button', { class: 'btn sec mini', text: 'Editar', onclick: async () => { if (await formMovimiento(x, { clientes })) ruta(); } }) : null, ' ',
        esAdmin() ? h('button', { class: 'btn peligro mini', text: '×', 'aria-label': 'Borrar', onclick: async () => {
          if (!await confirmar('¿Borrar este movimiento?', `${x.categoria} · ${plata(x.monto, x.moneda)} del ${fechaLinda(x.fecha)}`)) return;
          await intentar(() => datos.borrarMovimiento(x.id), 'Borrado.'); ruta();
        } }) : null))));
    if (!lista.length) cuerpoTabla.replaceChildren(h('tr', {}, h('td', { colspan: 6, class: 'vacio', text: 'No hay movimientos en ' + MESES_LARGOS[m - 1] + ' ' + a + '.' })));
    const filas = [];
    if (esAdmin()) {
      for (const mon of ['ARS', 'USD']) {
        const deMon = movs.filter((x) => x.moneda === mon);
        if (!deMon.length) continue;
        const ing = sumar(deMon.filter((x) => x.tipo === 'ingreso')), gas = sumar(deMon.filter((x) => x.tipo === 'gasto'));
        filas.push(h('tr', { class: 'total' }, h('td', { colspan: 4, text: `Resultado del mes en ${mon} (ingresos ${plata(ing, mon)} − gastos ${plata(gas, mon)})` }),
          h('td', { class: 'num ' + (ing - gas >= 0 ? 'pos' : 'neg'), text: plata(ing - gas, mon) }), h('td')));
      }
    }
    pie.replaceChildren(...filas);
  }
  selTipo.addEventListener('change', pintar);
  pintar();

  async function cargarFijos() {
    const ant = new Date(a, m - 2, 1);
    const am = `${ant.getFullYear()}-${String(ant.getMonth() + 1).padStart(2, '0')}`;
    const ultimo = new Date(ant.getFullYear(), ant.getMonth() + 1, 0).getDate();
    const previos = (await datos.listarMovimientos({ desde: am + '-01', hasta: `${am}-${ultimo}` })).filter((x) => x.tipo === 'gasto' && x.fijo);
    const clave = (x) => [x.categoria, x.descripcion || '', x.moneda].join('|');
    const ya = new Set(movs.filter((x) => x.fijo).map(clave));
    const faltan = previos.filter((x) => !ya.has(clave(x)));
    if (!faltan.length) return aviso(previos.length ? 'Los gastos fijos de este mes ya están cargados.' : 'El mes anterior no tiene gastos marcados como fijos.');
    const diasMes = new Date(a, m, 0).getDate();
    const ok = await dialogo({
      titulo: 'Cargar gastos fijos de ' + MESES_LARGOS[m - 1],
      cuerpo: h('div', {}, h('p', { class: 'suave', text: 'Se copian estos gastos del mes anterior. Después podés editar el monto si cambió.' }),
        h('ul', { class: 'lista bloque' }, faltan.map((x) => h('li', {}, h('div', { class: 'cuerpo', text: `${x.categoria}${x.descripcion ? ' · ' + x.descripcion : ''}` }), h('span', { class: 'mono', text: plata(x.monto, x.moneda) }))))),
      textoGuardar: 'Cargar ' + faltan.length,
      alGuardar: () => datos.guardarMovimientos(faltan.map((x) => ({
        tipo: 'gasto', fijo: true, categoria: x.categoria, descripcion: x.descripcion, monto: x.monto, moneda: x.moneda, medio_pago: x.medio_pago,
        fecha: `${mes}-${String(Math.min(Number(x.fecha.slice(8, 10)), diasMes)).padStart(2, '0')}`,
      }))),
    });
    if (ok) { aviso('Gastos fijos cargados.'); ruta(); }
  }

  $main.replaceChildren(
    h('div', { class: 'encabezado' }, h('h1', { text: esAdmin() ? 'Ingresos y gastos' : 'Cargar plata' }),
      h('button', { class: 'btn', text: '+ Gasto', onclick: async () => { if (await formMovimiento({ tipo: 'gasto' }, { clientes })) ruta(); } }),
      h('button', { class: 'btn', text: '+ Ingreso', onclick: async () => { if (await formMovimiento({ tipo: 'ingreso' }, { clientes })) ruta(); } }),
      h('button', { class: 'btn sec', text: 'Cargar gastos fijos del mes', onclick: () => intentar(cargarFijos).catch(() => {}) })),
    esAdmin() ? null : h('p', { class: 'suave chico bloque', text: 'Acá ves lo que cargaste vos y los pagos de clientes. Los totales de la empresa los ve Luciano.' }),
    h('div', { class: 'filtros' }, selMes, selTipo),
    h('div', { class: 'panel tabla-env' }, h('table', { class: 'tabla-movs' },
      h('thead', {}, h('tr', {}, ['Fecha', 'Tipo', 'Categoría', 'Detalle'].map((t) => h('th', { text: t })), h('th', { class: 'num', text: 'Monto' }), h('th', { class: 'num' }, h('span', { hidden: true, text: 'Acciones' })))),
      cuerpoTabla, pie)));
}

// ------------------------------------------------------------------
// Analytics (solo Luciano)
// ------------------------------------------------------------------
async function vistaAnalytics() {
  const [movs, acuerdos] = await Promise.all([datos.listarMovimientos(), datos.listarTodosAcuerdos()]);
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const hoy = hoyISO();
  const anioHoy = Number(hoy.slice(0, 4));
  const anios = [...new Set([anioHoy, ...movs.map((x) => Number(x.fecha.slice(0, 4)))])].sort((x, y) => y - x);
  const anio = Number(params.get('anio')) || anioHoy;
  const monedasConDatos = [...new Set(movs.map((x) => x.moneda))];
  const moneda = ['ARS', 'USD'].includes(params.get('moneda')) ? params.get('moneda') : (monedasConDatos.includes('ARS') || !monedasConDatos.length ? 'ARS' : 'USD');
  const ir = (an, mo) => { location.hash = `#/analytics?anio=${an}&moneda=${mo}`; };
  const selAnio = sel('anio', anios.map((x) => [x, String(x)]), anio, { 'aria-label': 'Año' });
  const selMon = sel('moneda', [['ARS', 'Pesos (ARS)'], ['USD', 'Dólares (USD)']], moneda, { 'aria-label': 'Moneda' });
  selAnio.addEventListener('change', () => ir(selAnio.value, selMon.value));
  selMon.addEventListener('change', () => ir(selAnio.value, selMon.value));

  const delAnio = movs.filter((x) => x.moneda === moneda && x.fecha.startsWith(String(anio)));
  const meses = MESES.map((nombre, i) => {
    const pref = `${anio}-${String(i + 1).padStart(2, '0')}`;
    const mm = delAnio.filter((x) => x.fecha.startsWith(pref));
    const ingresos = sumar(mm.filter((x) => x.tipo === 'ingreso'));
    const fijos = sumar(mm.filter((x) => x.tipo === 'gasto' && x.fijo));
    const varios = sumar(mm.filter((x) => x.tipo === 'gasto' && !x.fijo));
    return { nombre, largo: MESES_LARGOS[i], pref, ingresos, fijos, varios, gastos: fijos + varios, resultado: ingresos - fijos - varios };
  });
  const tot = meses.reduce((t, x) => ({ ingresos: t.ingresos + x.ingresos, fijos: t.fijos + x.fijos, varios: t.varios + x.varios, gastos: t.gastos + x.gastos, resultado: t.resultado + x.resultado }), { ingresos: 0, fijos: 0, varios: 0, gastos: 0, resultado: 0 });
  const mesesTranscurridos = anio < anioHoy ? 12 : anio > anioHoy ? 0 : Number(hoy.slice(5, 7));
  const iMes = anio === anioHoy ? Number(hoy.slice(5, 7)) - 1 : 11;
  const esteMes = meses[iMes];
  const anterior = iMes > 0 ? meses[iMes - 1] : null;

  // Por cobrar: saldo de tratos de proyecto vigentes en esta moneda
  const ingresosPorAcuerdo = {};
  for (const x of movs) if (x.tipo === 'ingreso' && x.acuerdo_id) ingresosPorAcuerdo[x.acuerdo_id] = (ingresosPorAcuerdo[x.acuerdo_id] || 0) + Number(x.monto);
  const porCobrar = acuerdos.filter((x) => x.moneda === moneda && x.estado === 'vigente' && x.tipo !== 'mensual')
    .reduce((t, x) => t + Math.max(0, Number(x.monto) - (ingresosPorAcuerdo[x.id] || 0)), 0);
  const abonos = acuerdos.filter((x) => x.moneda === moneda && x.estado === 'vigente' && x.tipo === 'mensual').reduce((t, x) => t + Number(x.monto), 0);

  const kpi = (t, v, extra, clase) => h('div', { class: 'kpi' }, h('span', { text: t }), h('strong', { class: clase || '', text: v }), extra ? h('small', { text: extra }) : null);
  const variacion = (a, b) => (b ? ((a - b) / b * 100).toFixed(0) + '% vs. ' + anterior.largo : null);
  const kpis = h('div', { class: 'kpis' },
    kpi('Ingresos ' + anio, plata(tot.ingresos, moneda), mesesTranscurridos ? 'Promedio por mes: ' + plata(tot.ingresos / mesesTranscurridos, moneda) : null),
    kpi('Gastos ' + anio, plata(tot.gastos, moneda), `Fijos ${plata(tot.fijos, moneda)} · varios ${plata(tot.varios, moneda)}`),
    kpi('Resultado ' + anio, plata(tot.resultado, moneda), tot.ingresos ? 'Margen ' + (tot.resultado / tot.ingresos * 100).toFixed(0) + '%' : null, tot.resultado >= 0 ? 'pos' : 'neg'),
    kpi('Ingresos de ' + esteMes.largo, plata(esteMes.ingresos, moneda), anterior ? variacion(esteMes.ingresos, anterior.ingresos) : null),
    kpi('Gastos de ' + esteMes.largo, plata(esteMes.gastos, moneda), `Fijos ${plata(esteMes.fijos, moneda)} · varios ${plata(esteMes.varios, moneda)}`),
    kpi('Por cobrar', plata(porCobrar, moneda), abonos ? 'Abonos mensuales vigentes: ' + plata(abonos, moneda) + '/mes' : 'Saldo de tratos vigentes'));

  // Gastos por categoría
  const porCat = {};
  for (const x of delAnio) if (x.tipo === 'gasto') porCat[x.categoria] = (porCat[x.categoria] || 0) + Number(x.monto);
  const cats = Object.entries(porCat).sort((p, q) => q[1] - p[1]);

  const graf1 = h('section', { class: 'panel' }, h('h2', { text: 'Ingresos y gastos por mes' }),
    h('div', { class: 'leyenda' }, h('span', {}, h('i', { class: 'serie-ingreso' }), 'Ingresos'), h('span', {}, h('i', { class: 'serie-gasto' }), 'Gastos')),
    graficoMeses(meses, moneda));
  const graf2 = h('section', { class: 'panel' }, h('h2', { text: 'Gastos por categoría · ' + anio }),
    cats.length ? graficoCategorias(cats, moneda, tot.gastos) : h('p', { class: 'vacio', text: 'Sin gastos en ' + anio + '.' }));

  const celda = (v, clase = '') => h('td', { class: 'num ' + clase, text: plata(v, moneda) });
  const tabla = h('section', { class: 'panel tabla-env' }, h('h2', { text: 'Resumen mensual y anual · ' + moneda }),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: 'Mes' }), ['Ingresos', 'Gastos fijos', 'Gastos varios', 'Gastos totales', 'Resultado'].map((t) => h('th', { class: 'num', text: t })))),
      h('tbody', {}, meses.map((x) => h('tr', {}, h('td', {}, h('a', { href: '#/plata?mes=' + x.pref, text: x.largo })), celda(x.ingresos), celda(x.fijos), celda(x.varios), celda(x.gastos), celda(x.resultado, x.resultado >= 0 ? 'pos' : 'neg')))),
      h('tfoot', {}, h('tr', { class: 'total' }, h('td', { text: 'Total ' + anio }), celda(tot.ingresos), celda(tot.fijos), celda(tot.varios), celda(tot.gastos), celda(tot.resultado, tot.resultado >= 0 ? 'pos' : 'neg')))));

  // Comparación entre años
  const porAnio = anios.map((an) => {
    const l = movs.filter((x) => x.moneda === moneda && x.fecha.startsWith(String(an)));
    const i = sumar(l.filter((x) => x.tipo === 'ingreso')), g = sumar(l.filter((x) => x.tipo === 'gasto'));
    return { an, i, g, r: i - g };
  });
  const tablaAnios = porAnio.length > 1 ? h('section', { class: 'panel tabla-env' }, h('h2', { text: 'Año por año · ' + moneda }),
    h('table', {}, h('thead', {}, h('tr', {}, h('th', { text: 'Año' }), ['Ingresos', 'Gastos', 'Resultado'].map((t) => h('th', { class: 'num', text: t })))),
      h('tbody', {}, porAnio.map((x) => h('tr', {}, h('td', { text: String(x.an) }), celda(x.i), celda(x.g), celda(x.r, x.r >= 0 ? 'pos' : 'neg')))))) : null;

  // Gastos varios del año (detalle)
  const varios = delAnio.filter((x) => x.tipo === 'gasto' && !x.fijo).slice(0, 50);
  const tablaVarios = h('section', { class: 'panel tabla-env' }, h('h2', { text: 'Gastos varios · ' + anio }),
    varios.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Fecha', 'Categoría', 'Detalle'].map((t) => h('th', { text: t })), h('th', { class: 'num', text: 'Monto' }))),
      h('tbody', {}, varios.map((x) => h('tr', {}, h('td', { class: 'mono chico', text: fechaLinda(x.fecha) }), h('td', { text: x.categoria }), h('td', { text: x.descripcion || '' }), celda(x.monto))))) :
      h('p', { class: 'suave', text: 'Sin gastos varios en ' + anio + '.' }));

  $main.replaceChildren(
    h('div', { class: 'encabezado' }, h('h1', { text: 'Analytics' })),
    h('div', { class: 'filtros' }, selAnio, selMon),
    monedasConDatos.length > 1 ? h('p', { class: 'suave chico bloque', text: 'Pesos y dólares se muestran por separado, sin convertir. Cambiá la moneda arriba.' }) : null,
    kpis,
    h('div', { class: 'graficos' }, graf1, graf2),
    h('div', { class: 'bloque' }, tabla),
    tablaAnios ? h('div', { class: 'bloque' }, tablaAnios) : null,
    h('div', { class: 'bloque' }, tablaVarios));
}

// Escala "linda": 0, 250 mil, 500 mil…
function escala(max) {
  if (max <= 0) return { tope: 1, paso: 1 };
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((x) => x * pot).find((x) => x >= bruto);
  return { tope: Math.ceil(max / paso) * paso, paso };
}
function barra(x, y, w, alto, r = 4) {
  if (alto <= 0) return '';
  const rr = Math.min(r, alto, w / 2);
  return `M${x},${y + alto}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + alto}Z`;
}
function ponerTooltip(cont, tip, x, y, titulo, filas) {
  tip.replaceChildren(h('b', { text: titulo }), ...filas.map(([color, t]) => h('div', {}, color ? h('i', { class: color }) : null, t)));
  tip.hidden = false;
  const r = cont.getBoundingClientRect();
  tip.style.left = Math.max(70, Math.min(r.width - 70, x)) + 'px';
  tip.style.top = y + 'px';
}

function graficoMeses(meses, moneda) {
  const W = 520, H = 280, m = { t: 12, r: 6, b: 30, l: 56 };
  const ancho = W - m.l - m.r, alto = H - m.t - m.b;
  const { tope, paso } = escala(Math.max(...meses.map((x) => Math.max(x.ingresos, x.gastos))));
  const y = (v) => m.t + alto - (v / tope) * alto;
  const banda = ancho / 12;
  const bw = Math.min(18, (banda - 10) / 2);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Ingresos y gastos por mes, en ' + moneda });
  for (let v = 0; v <= tope; v += paso) {
    svg.append(s('line', { class: v === 0 ? 'base' : 'grid', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }),
      s('text', { class: 'eje', x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, compacto.format(v)));
  }
  const cont = h('div', { class: 'grafico' });
  const tip = h('div', { class: 'tooltip', hidden: true });
  meses.forEach((x, i) => {
    const cx = m.l + banda * i + banda / 2;
    svg.append(
      s('path', { d: barra(cx - bw - 1, y(x.ingresos), bw, m.t + alto - y(x.ingresos)), fill: '#3D8BE0' }),
      s('path', { d: barra(cx + 1, y(x.gastos), bw, m.t + alto - y(x.gastos)), fill: '#C0638A' }),
      s('text', { class: 'eje', x: cx, y: H - 8, 'text-anchor': 'middle' }, x.nombre));
    const hit = s('rect', { x: m.l + banda * i, y: m.t, width: banda, height: alto, fill: 'transparent' });
    const mostrar = () => {
      const esc = cont.getBoundingClientRect().width / W;
      ponerTooltip(cont, tip, cx * esc, y(Math.max(x.ingresos, x.gastos)) * esc, x.largo, [
        ['serie-ingreso', 'Ingresos ' + plata(x.ingresos, moneda)], ['serie-gasto', 'Gastos ' + plata(x.gastos, moneda)], [null, 'Resultado ' + plata(x.resultado, moneda)]]);
    };
    hit.addEventListener('pointerenter', mostrar);
    hit.addEventListener('pointerdown', mostrar);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    svg.append(hit);
  });
  cont.append(svg, tip);
  return cont;
}

function graficoCategorias(cats, moneda, total) {
  // Barras horizontales en HTML: el texto queda legible en el celular.
  const max = cats[0][1];
  return h('div', { class: 'cats', role: 'list' }, cats.map(([nombre, v]) => {
    const relleno = h('span', { class: 'cats-barra serie-gasto' });
    relleno.style.width = Math.max(1, v / max * 100) + '%';
    return h('div', { class: 'cats-fila', role: 'listitem', title: `${nombre}: ${plata(v, moneda)} (${(v / total * 100).toFixed(1)}%)` },
      h('span', { class: 'cats-nombre', text: nombre }),
      h('span', { class: 'cats-pista' }, relleno),
      h('span', { class: 'cats-valor mono', text: plata(v, moneda) + ' · ' + Math.round(v / total * 100) + '%' }));
  }));
}

// ------------------------------------------------------------------
// Registro y copias (solo Luciano)
// ------------------------------------------------------------------
async function vistaRegistro() {
  const [regs, perfiles] = await Promise.all([datos.listarAuditoria(), datos.listarPerfiles()]);
  const quien = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre]));
  const ACC = { insert: 'creó', update: 'editó', delete: 'borró', ingreso: 'entró al panel' };
  const TAB = { clientes: 'cliente', historial: 'historial', acuerdos: 'trato', movimientos: 'movimiento', archivos: 'PDF', sesion: '' };
  const resumen = (r) => {
    const d = r.detalle?.despues || r.detalle || {};
    return d.nombre || d.concepto || (d.categoria ? `${d.categoria} ${plata(d.monto, d.moneda)}` : '') || (d.texto ? d.texto.slice(0, 80) : '');
  };
  const copia = async () => {
    const d = await datos.copia();
    descargar(`vectyo-panel-copia-${hoyISO()}.json`, JSON.stringify(d, null, 2), 'application/json');
  };
  const pipeline = async () => {
    const [cl, ac] = await Promise.all([datos.listarClientes(), datos.listarTodosAcuerdos()]);
    const cab = ['id', 'fecha_ingreso', 'negocio', 'rubro', 'ciudad', 'contacto', 'whatsapp', 'instagram', 'web', 'origen', 'servicio_interes', 'etapa', 'responsable', 'proxima_accion', 'fecha_proxima_accion', 'monto_estimado', 'moneda', 'notas'];
    const esc = (v) => { const t = String(v ?? '').replace(/\r?\n/g, ' '); return /[",;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const filas = [...cl].sort((x, y) => String(x.creado_en).localeCompare(String(y.creado_en))).map((c, i) => {
      const a = ac.find((x) => x.cliente_id === c.id && x.estado !== 'cancelado');
      return [i + 1, String(c.creado_en || '').slice(0, 10), c.nombre, c.rubro, c.ciudad, c.contacto, c.whatsapp, c.instagram, c.web, c.origen, (c.servicios || []).join(' + '), c.etapa, c.responsable, c.proxima_accion, c.fecha_proxima_accion, a?.monto, a?.moneda || 'ARS', c.notas].map(esc).join(',');
    });
    descargar('pipeline.csv', '﻿' + [cab.join(','), ...filas].join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
  };
  $main.replaceChildren(
    h('div', { class: 'encabezado' }, h('h1', { text: 'Registro y copias' })),
    h('section', { class: 'panel' }, h('h2', { text: 'Copias de seguridad' }),
      h('p', { class: 'suave bloque', text: 'Una vez por semana: descargá la copia y guardala en la carpeta privada de Drive "Vectyo/Copias del panel". Los PDF no van en la copia: guardá los originales también en Drive.' }),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn', text: 'Descargar copia completa', onclick: () => intentar(copia, 'Copia descargada.').catch(() => {}) }),
        h('button', { class: 'btn sec', text: 'Exportar pipeline.csv', onclick: () => intentar(pipeline, 'pipeline.csv descargado.').catch(() => {}) }))),
    h('section', { class: 'panel tabla-env' }, h('h2', { text: 'Quién hizo qué (últimos 300)' }),
      regs.length ? h('table', {}, h('thead', {}, h('tr', {}, ['Cuándo', 'Quién', 'Qué', 'Detalle'].map((t) => h('th', { text: t })))),
        h('tbody', {}, regs.map((r) => h('tr', {},
          h('td', { class: 'mono chico', text: new Date(r.cuando).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }),
          h('td', { text: r.quien_nombre || quien[r.quien] || 'Sistema' }),
          h('td', { text: `${ACC[r.accion] || r.accion} ${TAB[r.tabla] ?? r.tabla}`.trim() }),
          h('td', { class: 'chico suave', text: resumen(r) }))))) :
        h('p', { class: 'suave', text: 'Sin registros todavía.' })));
}

// ------------------------------------------------------------------
datos?.alCambiarSesion?.((ev) => { if (ev === 'SIGNED_OUT' && yo) { yo = null; pantallaLogin(); } });
iniciar();
