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
const CAT_GASTO = ['Publicidad', 'Herramienta IA', 'Dominios', 'Hosting', 'Base de datos', 'Otro'];
const FRECUENCIAS = [['unico', 'Único'], ['mensual', 'Mensual'], ['anual', 'Anual']];
const CAT_INGRESO = ['Seña', 'Pago de proyecto', 'Abono mensual', 'Otro'];
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
// Reemplaza el contenido de un elemento salteando los vacíos (null/false),
// que replaceChildren escribiría como texto "null".
function poner(el, ...hijos) { el.replaceChildren(...hijos.flat(Infinity).filter((x) => x != null && x !== false)); }
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
// Íconos de trazo (estilo iPhone), dibujados acá para no cargar nada de afuera
const ICONOS = {
  clientes: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2.5 19.5c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2|M16 4.7a3.3 3.3 0 0 1 0 6.4|M18.2 14.6c1.8.7 2.9 2.3 3.3 4.9',
  finanzas: 'M3 21h18|M6 17v-5|M11 17V7|M16 17v-8|M20.5 17V4',
  registro: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3.2 2',
  mas: 'M12 5v14|M5 12h14',
  ingreso: 'M17 7 7 17|M15 17H7V9',
  gasto: 'M7 17 17 7|M9 7h8v8',
  editar: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z',
  borrar: 'M4 7h16|M10 11v6|M14 11v6|M6 7l1 13h10l1-13|M9 7V4h6v3',
  salir: 'M15 4h4v16h-4|M10 8l-4 4 4 4|M6 12h10',
  izq: 'M15 5l-7 7 7 7',
  der: 'M9 5l7 7-7 7',
  whatsapp: 'M4 20l1.4-4A8 8 0 1 1 8.2 18.7z|M9 9.5c.3 2 1.6 3.6 3.6 4.5l1.2-1.1 2 .9',
  subir: 'M12 15V4|M7 9l5-5 5 5|M5 20h14',
  pago: 'M3 7h18v11H3z|M3 11h18|M7 15h3',
  web: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M3 12h18|M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  mail: 'M3 6h18v12H3z|M3 7l9 6 9-6',
  camara: 'M4 8h3l2-3h6l2 3h3v11H4z|M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  volver: 'M19 12H5|M11 6l-6 6 6 6',
};
function icono(nombre) {
  return s('svg', { class: 'ico', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    (ICONOS[nombre] || '').split('|').map((d) => s('path', { d })));
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
  poner(box, d);
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

// Selector tipo iPhone (opciones excluyentes) y chips
function segmento(name, opciones, valor, clase = '') {
  return h('div', { class: 'segmento ' + clase, role: 'radiogroup' }, opciones.map(([v, t]) =>
    h('label', {}, h('input', { type: 'radio', name, value: v, checked: String(v) === String(valor ?? '') }), h('span', { text: t }))));
}
function chipsRadio(name, opciones, valor) {
  return h('div', { class: 'chips', role: 'radiogroup' }, opciones.map((v) =>
    h('label', {}, h('input', { type: 'radio', name, value: v, checked: v === valor }), h('span', { text: v }))));
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
  poner($app, caja(h('h1', { text: 'Falta configurar' }),
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
  poner($app, caja(h('h1', { text: 'Panel Vectyo' }), h('p', { class: 'suave', text: 'Entrá con tu mail y contraseña.' }), form));
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
    poner($app, caja(h('p', { class: 'suave', text: 'Preparando…' })));
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
  poner($app, caja(...partes, form));
  codigo.focus();
}

function pantallaSinPermiso() {
  poner($app, caja(h('h1', { text: 'Sin acceso' }),
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
function secciones() {
  const l = [['#/clientes', 'Clientes', 'clientes'], ['#/finanzas', 'Finanzas', 'finanzas']];
  if (esAdmin()) l.push(['#/registro', 'Registro', 'registro']);
  return l;
}
function armarMarco() {
  const links = secciones();
  const nav = h('nav', { class: 'nav', 'aria-label': 'Secciones' }, links.map(([href, t, ic]) => h('a', { href }, icono(ic), t)));
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Secciones' }, links.map(([href, t, ic]) => h('a', { href }, icono(ic), t)));
  $main = h('main', { id: 'contenido' });
  poner($app, 
    h('header', { class: 'barra' },
      h('a', { class: 'marca', href: '#/clientes' }, h('img', { src: 'isotipo-ciruela.svg', alt: '' }), 'VECTYO'),
      nav,
      h('div', { class: 'usuario' }, h('span', { class: 'quien suave chico', text: yo.nombre }),
        h('button', { class: 'btn sec mini', onclick: () => salir() }, icono('salir'), 'Salir'))),
    MODO_DEMO ? h('div', { class: 'demo', text: 'Modo demo: datos inventados, solo en esta compu. Nada se guarda.' }) : null,
    $main,
    tabbar,
    h('button', { class: 'fab', 'aria-label': 'Cargar algo nuevo', title: 'Cargar algo nuevo', onclick: hojaNuevo }, icono('mas')));
}
function marcarNav() {
  let actual = location.hash.split('?')[0].split('/')[1] || 'clientes';
  if (actual === 'cliente') actual = 'clientes';
  if (actual === 'plata' || actual === 'analytics') actual = 'finanzas';
  document.querySelectorAll('.nav a, .tabbar a').forEach((a) => {
    if (a.getAttribute('href') === '#/' + actual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
async function ruta() {
  if (!yo || !$main) return;
  const [, seccionCruda, id] = location.hash.split('?')[0].split('/');
  const seccion = seccionCruda || 'clientes';
  marcarNav();
  poner($main, h('p', { class: 'cargando', text: 'Cargando…' }));
  try {
    if (seccion === 'cliente' && id) await vistaFicha(decodeURIComponent(id));
    else if (['finanzas', 'plata', 'analytics'].includes(seccion)) await vistaFinanzas();
    else if (seccion === 'registro' && esAdmin()) await vistaRegistro();
    else await vistaClientes();
  } catch (e) {
    console.error(e);
    poner($main, h('div', { class: 'panel' }, h('p', { class: 'error', text: e.message || 'No se pudo cargar.' })));
  }
  window.scrollTo(0, 0);
}
addEventListener('hashchange', ruta);

// Botón "+": hoja con las tres cargas más comunes
function hojaNuevo() {
  const opcion = (ic, color, titulo, sub, accion) => h('button', { type: 'button', onclick: async () => { dlg.close(); if (await accion()) ruta(); } },
    h('span', { class: 'icono-caja' + ' ' + color }, icono(ic)), h('span', {}, titulo, h('small', { text: sub })));
  const dlg = h('dialog', { 'aria-label': 'Cargar algo nuevo' }, h('div', { class: 'contenido' },
    h('h2', { text: '¿Qué querés cargar?' }),
    h('div', { class: 'hoja' },
      opcion('ingreso', 'fondo-azul', 'Ingreso', 'Plata que entró: un cobro, una seña, un abono', () => formMovimiento({ tipo: 'ingreso' })),
      opcion('gasto', 'fondo-gasto', 'Gasto', 'Plata que salió: publicidad, herramientas, hosting…', () => formMovimiento({ tipo: 'gasto' })),
      opcion('clientes', 'fondo-ciruela', 'Cliente nuevo', 'Su ficha con datos y forma de trabajar', async () => { const c = await formCliente(); if (c) { location.hash = '#/cliente/' + c.id; return false; } return false; })),
    h('div', { class: 'acciones' }, h('button', { class: 'btn sec ancho', type: 'button', text: 'Cancelar', onclick: () => dlg.close() }))));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

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
    poner(grilla, ...lista.map((c) => h('a', { class: 'tarjeta', href: '#/cliente/' + encodeURIComponent(c.id) },
      avatar(c), h('span', { class: 'nombre', text: c.nombre }), h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }))));
    if (!lista.length) poner(grilla, h('p', { class: 'vacio', text: clientes.length ? 'No hay clientes con ese filtro.' : 'Todavía no hay clientes. Tocá "Nuevo cliente".' }));
  }
  buscar.addEventListener('input', pintar);
  etapa.addEventListener('change', pintar);
  pintar();
  poner($main, 
    h('div', { class: 'encabezado' }, h('h1', { text: 'Clientes' }), h('span', { class: 'suave chico', text: clientes.length + ' en total' }),
      h('button', { class: 'btn', onclick: async () => { const c = await formCliente(); if (c) location.hash = '#/cliente/' + c.id; } }, icono('mas'), 'Nuevo cliente')),
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
  const nuevoPago = async () => { if (await formMovimiento({ tipo: 'ingreso', cliente_id: c.id, categoria: 'Pago de proyecto' }, { cliente: c, acuerdos })) recargar(); };
  const subirPdf = async () => {
    const fs = await elegirArchivo('application/pdf', true);
    for (const f of fs) {
      if (f.size > 25 * 1024 * 1024) { aviso(f.name + ' pesa más de 25 MB.', true); continue; }
      await intentar(() => datos.subirArchivo(c.id, f), 'Subido: ' + f.name).catch(() => {});
    }
    if (fs.length) recargar();
  };

  // Cabecera
  const fotoBox = h('div', { class: 'foto-cambiar' }, avatar(c, true),
    h('button', { class: 'btn sec btn-icono', 'aria-label': 'Cambiar foto', title: 'Cambiar foto', onclick: async () => {
      const [f] = await elegirArchivo('image/jpeg,image/png,image/webp');
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return aviso('La foto pesa más de 5 MB. Probá con una más chica.', true);
      await intentar(() => datos.subirFoto(c, f), 'Foto actualizada.');
      recargar();
    } }, icono('camara')));
  const links = [
    urlWhatsapp(c.whatsapp) && h('a', { class: 'btn verde', href: urlWhatsapp(c.whatsapp), target: '_blank', rel: 'noopener noreferrer' }, icono('whatsapp'), 'WhatsApp'),
    h('button', { class: 'btn', onclick: nuevoPago }, icono('pago'), 'Cargar pago'),
    h('button', { class: 'btn sec', onclick: subirPdf }, icono('subir'), 'Subir PDF'),
    h('button', { class: 'btn sec', onclick: async () => { if (await formCliente(c)) recargar(); } }, icono('editar'), 'Editar'),
    urlInstagram(c.instagram) && h('a', { class: 'btn sec mini', href: urlInstagram(c.instagram), target: '_blank', rel: 'noopener noreferrer', text: 'Instagram' }),
    urlWeb(c.web) && h('a', { class: 'btn sec mini', href: urlWeb(c.web), target: '_blank', rel: 'noopener noreferrer' }, icono('web'), 'Web'),
    c.email && h('a', { class: 'btn sec mini', href: 'mailto:' + c.email }, icono('mail'), 'Mail'),
  ];
  const cab = h('div', { class: 'ficha-cab vidrio' }, fotoBox,
    h('div', { class: 'info' },
      h('h1', { text: c.nombre }),
      h('div', {}, h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }), ' ',
        (c.servicios || []).map((sv) => [h('span', { class: 'chip', text: sv }), ' '])),
      h('div', { class: 'botones' }, links,
        esAdmin() && h('button', { class: 'btn peligro mini', onclick: async () => {
          if (!await confirmar('¿Borrar ' + c.nombre + '?', 'Se borra la ficha con su historial, tratos y PDF. Los pagos quedan en Finanzas, sin cliente. No se puede deshacer.')) return;
          await intentar(() => datos.borrarCliente(c), 'Cliente borrado.');
          location.hash = '#/clientes';
        } }, icono('borrar'), 'Borrar'))));

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
    h('div', { class: 'acciones' }, h('button', { class: 'btn mini', onclick: nuevoPago }, icono('mas'), 'Cargar pago')),
    ingresos.length ? h('ul', { class: 'lista' }, ingresos.map((m) => h('li', {},
      h('span', { class: 'fecha', text: fechaLinda(m.fecha) }),
      h('div', { class: 'cuerpo' }, h('p', {}, h('strong', { text: plata(m.monto, m.moneda) }), ' · ' + m.categoria), m.descripcion ? h('p', { class: 'chico suave', text: m.descripcion }) : null),
      h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Editar pago', onclick: async () => { if (await formMovimiento(m, { cliente: c, acuerdos })) recargar(); } }, icono('editar'))))) :
      h('p', { class: 'suave chico', text: 'Sin pagos cargados.' }));

  // Archivos
  const pArchivos = h('section', { class: 'panel' },
    h('h2', {}, 'Archivos PDF', h('button', { class: 'btn mini', onclick: subirPdf }, icono('subir'), 'Subir PDF')),
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

  poner($main, 
    h('a', { class: 'volver', href: '#/clientes' }, icono('volver'), 'Clientes'),
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
// Finanzas: carga de ingresos y gastos (únicos, mensuales o anuales)
// ------------------------------------------------------------------
// Un movimiento mensual se carga una vez y cuenta todos los meses desde su fecha
// hasta la baja (fecha_fin). Uno anual cuenta una vez por año, en el mes de su fecha.
const mesDe = (iso) => String(iso).slice(0, 7);
function cuentaEnMes(m, pref) {
  const ini = mesDe(m.fecha);
  if (pref < ini) return false;
  if (m.fecha_fin && pref > mesDe(m.fecha_fin)) return false;
  const f = m.frecuencia || 'unico';
  if (f === 'mensual') return true;
  if (f === 'anual') return pref.slice(5) === ini.slice(5);
  return pref === ini;
}
// Activo = se va a seguir cobrando el mes que viene (sin baja, o con baja en un mes futuro).
const activoHoy = (m) => !m.fecha_fin || mesDe(m.fecha_fin) > mesDe(hoyISO());
const nombreFrecuencia = (f) => (FRECUENCIAS.find((x) => x[0] === f) || FRECUENCIAS[0])[1];
const tituloMov = (m) => m.descripcion || m.categoria;
function sumarMes(movs, pref, filtro = () => true) { return sumar(movs.filter((m) => filtro(m) && cuentaEnMes(m, pref))); }
function prefMes(anio, mes) { return `${anio}-${String(mes).padStart(2, '0')}`; }
function moverMes(pref, delta) { const [a, m] = pref.split('-').map(Number); const d = new Date(a, m - 1 + delta, 1); return prefMes(d.getFullYear(), d.getMonth() + 1); }
function nombreMes(pref) { const [a, m] = pref.split('-').map(Number); return MESES_LARGOS[m - 1] + ' ' + a; }

async function formMovimiento(m = {}, { cliente, acuerdos } = {}) {
  const esPagoCliente = !!cliente;
  const tipoInicial = esPagoCliente ? 'ingreso' : (m.tipo || 'gasto');
  const contDestino = h('div', { class: 'entera' });
  const ayudaFecha = h('span');
  const notaRecurrente = h('p', { class: 'chico suave entera' });
  const tipoSeg = esPagoCliente ? h('input', { type: 'hidden', name: 'tipo', value: 'ingreso' }) : segmento('tipo', [['ingreso', 'Ingreso'], ['gasto', 'Gasto']], tipoInicial, 'ingreso-gasto');
  const freqSeg = segmento('frecuencia', FRECUENCIAS, m.frecuencia || 'unico');
  const leer = (n, form) => form.querySelector(`[name="${n}"]:checked`)?.value || form.querySelector(`[name="${n}"]`)?.value;

  // Opciones extra: cliente, trato y medio de pago
  let clienteSel = null, acuerdoSel = null;
  if (esPagoCliente) {
    if (acuerdos?.length) acuerdoSel = sel('acuerdo_id', [['', 'Sin trato asociado'], ...acuerdos.filter((a) => a.estado !== 'cancelado').map((a) => [a.id, a.concepto + ' (' + a.moneda + ')'])], m.acuerdo_id || (acuerdos.find((a) => a.estado === 'vigente')?.id ?? ''));
  } else {
    const cl = await datos.listarClientes();
    clienteSel = sel('cliente_id', [['', 'Ninguno'], ...cl.map((x) => [x.id, x.nombre])], m.cliente_id || '');
  }
  const extras = h('details', { class: 'entera' }, h('summary', { class: 'chico', text: 'Más opciones (cliente, medio de pago)' }),
    h('div', { class: 'grilla-form bloque' },
      clienteSel ? campo('Cliente (si corresponde)', clienteSel) : null,
      acuerdoSel ? campo('Corresponde al trato', acuerdoSel) : null,
      campo('Medio de pago', inp('medio_pago', m.medio_pago, { placeholder: 'Transferencia, efectivo, Mercado Pago…' }))));
  if (esPagoCliente) extras.open = true;

  const cuerpo = h('div', { class: 'grilla-form' },
    esPagoCliente ? tipoSeg : h('div', { class: 'entera' }, tipoSeg),
    campo('Título *', inp('descripcion', m.descripcion, { required: true, maxlength: 120, placeholder: 'Ej: Claude Pro, Dominio vectyo.com, Seña web' }), 'entera'),
    campo('Monto *', inp('monto', m.monto, { class: 'grande', type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal', required: true, placeholder: '0' })),
    h('div', { class: 'campo' }, h('span', { class: 'suave chico', text: 'Moneda' }), segmento('moneda', [['ARS', 'Pesos'], ['USD', 'Dólares']], m.moneda || 'ARS')),
    esPagoCliente ? h('input', { type: 'hidden', name: 'frecuencia', value: 'unico' }) : h('div', { class: 'entera campo' }, h('span', { class: 'suave chico', text: '¿Cada cuánto?' }), freqSeg),
    notaRecurrente,
    contDestino,
    campo(ayudaFecha, inp('fecha', m.fecha || hoyISO(), { type: 'date', required: true })),
    extras);

  const actualizar = () => {
    const form = cuerpo;
    const tipo = leer('tipo', form) || tipoInicial;
    const freq = leer('frecuencia', form) || 'unico';
    const opciones = tipo === 'gasto' ? CAT_GASTO : CAT_INGRESO;
    const actual = contDestino.querySelector('[name="categoria"]:checked')?.value || m.categoria;
    const lista = actual && !opciones.includes(actual) && (m.tipo || tipoInicial) === tipo ? [...opciones, actual] : opciones;
    poner(contDestino, h('span', { class: 'suave chico campo', text: tipo === 'gasto' ? 'Destino del gasto *' : 'Tipo de ingreso *' }),
      chipsRadio('categoria', lista, lista.includes(actual) ? actual : ''));
    ayudaFecha.textContent = freq === 'mensual' ? 'Desde (primer mes)' : freq === 'anual' ? 'Fecha del pago anual' : 'Fecha';
    notaRecurrente.textContent = freq === 'mensual' ? 'Se cuenta solo todos los meses, hasta que le des de baja. No hace falta volver a cargarlo.'
      : freq === 'anual' ? 'Se cuenta una vez por año, en el mes de esta fecha, hasta que le des de baja.' : '';
    notaRecurrente.hidden = freq === 'unico';
  };
  cuerpo.addEventListener('change', (ev) => { if (['tipo', 'frecuencia'].includes(ev.target.name)) actualizar(); });
  if (acuerdoSel) acuerdoSel.addEventListener('change', () => { const a = acuerdos.find((x) => x.id === acuerdoSel.value); if (a) { const r = cuerpo.querySelector(`[name="moneda"][value="${a.moneda}"]`); if (r) r.checked = true; } });
  actualizar();

  return dialogo({
    titulo: m.id ? 'Editar movimiento' : esPagoCliente ? 'Pago de ' + cliente.nombre : '¿Qué cargamos?',
    cuerpo,
    alGuardar: async (fd) => {
      const monto = Number(fd.get('monto'));
      if (!(monto > 0)) throw new Error('Poné un monto mayor a cero.');
      const categoria = fd.get('categoria');
      if (!categoria) throw new Error('Elegí ' + (fd.get('tipo') === 'gasto' ? 'el destino del gasto.' : 'el tipo de ingreso.'));
      const fila = {
        tipo: fd.get('tipo'), descripcion: String(fd.get('descripcion') || '').trim() || null, monto,
        moneda: fd.get('moneda') || 'ARS', frecuencia: fd.get('frecuencia') || 'unico', categoria,
        fecha: fd.get('fecha') || hoyISO(), medio_pago: String(fd.get('medio_pago') || '').trim() || null,
        cliente_id: esPagoCliente ? cliente.id : (fd.get('cliente_id') || null),
        acuerdo_id: esPagoCliente ? (fd.get('acuerdo_id') || null) : (fd.get('cliente_id') && fd.get('cliente_id') === m.cliente_id ? m.acuerdo_id || null : null),
      };
      if (m.id) fila.id = m.id;
      await datos.guardarMovimiento(fila);
      aviso(fila.tipo === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado');
    },
  });
}

async function darDeBaja(m) {
  const fin = hoyISO() < m.fecha ? m.fecha : hoyISO();
  const ok = await dialogo({
    titulo: 'Dar de baja "' + tituloMov(m) + '"',
    cuerpo: h('p', { class: 'suave', text: `Se sigue contando en ${nombreMes(mesDe(fin))} y deja de contarse desde el mes que viene. Los meses anteriores no cambian.` }),
    textoGuardar: 'Dar de baja',
    peligro: true,
    alGuardar: () => datos.guardarMovimiento({ id: m.id, fecha_fin: fin }),
  });
  if (ok) { aviso('Dado de baja'); ruta(); }
}

function filaMovimiento(m, nombres, { pref } = {}) {
  const puedeEditar = esAdmin() || m.creado_por === yo.id;
  const recurrente = (m.frecuencia || 'unico') !== 'unico';
  return h('li', {},
    h('span', { class: 'icono-mov ' + m.tipo }, icono(m.tipo)),
    h('div', { class: 'cuerpo' },
      h('p', {}, h('strong', { text: tituloMov(m) })),
      h('p', { class: 'chico suave' },
        h('span', { class: 'chip', text: m.categoria }), ' ',
        recurrente ? h('span', { class: 'chip ' + m.frecuencia, text: nombreFrecuencia(m.frecuencia) + (m.fecha_fin ? ' · baja ' + fechaLinda(m.fecha_fin) : '') }) : null, ' ',
        m.cliente_id && nombres[m.cliente_id] ? nombres[m.cliente_id] + ' · ' : '',
        recurrente ? 'desde ' + fechaLinda(m.fecha) : fechaLinda(m.fecha))),
    h('span', { class: 'monto ' + (m.tipo === 'ingreso' ? 'pos' : 'neg'), text: (m.tipo === 'ingreso' ? '+ ' : '− ') + plata(m.monto, m.moneda) }),
    puedeEditar ? h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Editar ' + tituloMov(m), title: 'Editar', onclick: async () => { if (await formMovimiento(m)) ruta(); } }, icono('editar')) : null,
    recurrente && activoHoy(m) && puedeEditar ? h('button', { class: 'btn sec mini', onclick: () => darDeBaja(m) }, 'Dar de baja') : null,
    esAdmin() ? h('button', { class: 'btn peligro mini btn-icono', 'aria-label': 'Borrar ' + tituloMov(m), title: 'Borrar', onclick: async () => {
      if (!await confirmar('¿Borrar "' + tituloMov(m) + '"?', recurrente ? 'Se borra de todos los meses, también de los pasados. Si solo dejó de pagarse, usá "Dar de baja".' : `${plata(m.monto, m.moneda)} del ${fechaLinda(m.fecha)}. No se puede deshacer.`)) return;
      await intentar(() => datos.borrarMovimiento(m.id), 'Borrado'); ruta();
    } }, icono('borrar')) : null);
}

async function vistaFinanzas() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const hoyPref = mesDe(hoyISO());
  const pref = /^\d{4}-\d{2}$/.test(params.get('mes') || '') ? params.get('mes') : hoyPref;
  const [movsTodos, acuerdos, clientes] = await Promise.all([datos.listarMovimientos(), datos.listarTodosAcuerdos(), datos.listarClientes()]);
  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]));
  const monedasConDatos = [...new Set(movsTodos.map((x) => x.moneda))];
  const moneda = ['ARS', 'USD'].includes(params.get('moneda')) ? params.get('moneda') : (monedasConDatos.includes('ARS') || !monedasConDatos.length ? 'ARS' : 'USD');
  const ir = (p, mo) => { location.hash = `#/finanzas?mes=${p}&moneda=${mo}`; };
  const movs = movsTodos.filter((x) => x.moneda === moneda);
  const anio = Number(pref.slice(0, 4));
  const esGasto = (m) => m.tipo === 'gasto';
  const esIngreso = (m) => m.tipo === 'ingreso';
  const de = (f) => (m) => (m.frecuencia || 'unico') === f;

  // Costo fijo: mensuales + anuales/12 que siguen activos
  const fijosActivos = movs.filter((m) => esGasto(m) && (m.frecuencia === 'mensual' || m.frecuencia === 'anual') && activoHoy(m));
  const costoFijo = fijosActivos.reduce((t, m) => t + Number(m.monto) / (m.frecuencia === 'anual' ? 12 : 1), 0);
  const ingMes = sumarMes(movs, pref, esIngreso), gasMes = sumarMes(movs, pref, esGasto);
  const mesesAnio = MESES.map((nombre, i) => {
    const p = prefMes(anio, i + 1);
    const futuro = p > hoyPref;
    const v = (f) => (futuro ? 0 : sumarMes(movs, p, f));
    const ingresos = v(esIngreso);
    const mensuales = v((m) => esGasto(m) && de('mensual')(m));
    const anuales = v((m) => esGasto(m) && de('anual')(m));
    const unicos = v((m) => esGasto(m) && de('unico')(m));
    return { nombre, largo: MESES_LARGOS[i], pref: p, futuro, ingresos, mensuales, anuales, unicos, gastos: mensuales + anuales + unicos, resultado: ingresos - mensuales - anuales - unicos };
  });
  const tot = mesesAnio.reduce((t, x) => { for (const k of ['ingresos', 'mensuales', 'anuales', 'unicos', 'gastos', 'resultado']) t[k] += x[k]; return t; }, { ingresos: 0, mensuales: 0, anuales: 0, unicos: 0, gastos: 0, resultado: 0 });

  // Por cobrar a clientes (tratos de proyecto vigentes)
  const cobradoPorAcuerdo = {};
  for (const x of movsTodos) if (x.tipo === 'ingreso' && x.acuerdo_id) cobradoPorAcuerdo[x.acuerdo_id] = (cobradoPorAcuerdo[x.acuerdo_id] || 0) + Number(x.monto);
  const porCobrar = acuerdos.filter((x) => x.moneda === moneda && x.estado === 'vigente' && x.tipo !== 'mensual')
    .reduce((t, x) => t + Math.max(0, Number(x.monto) - (cobradoPorAcuerdo[x.id] || 0)), 0);

  const kpi = (t, v, extra, clase = '') => h('div', { class: 'kpi ' + clase }, h('span', { text: t }), h('strong', { text: v }), extra ? h('small', { text: extra }) : null);
  const resMes = ingMes - gasMes;
  const kpis = h('div', { class: 'kpis' },
    kpi('Costo fijo por mes', plata(costoFijo, moneda), `${fijosActivos.length} gastos mensuales y anuales activos`, 'destacado'),
    kpi('Ingresos de ' + MESES_LARGOS[Number(pref.slice(5)) - 1], plata(ingMes, moneda)),
    kpi('Gastos de ' + MESES_LARGOS[Number(pref.slice(5)) - 1], plata(gasMes, moneda)),
    kpi('Resultado del mes', plata(resMes, moneda), ingMes ? 'Margen ' + Math.round(resMes / ingMes * 100) + '%' : null),
    kpi('Resultado ' + anio, plata(tot.resultado, moneda), anio === Number(hoyPref.slice(0, 4)) ? 'Hasta hoy' : null),
    kpi('Por cobrar a clientes', plata(porCobrar, moneda), 'Saldo de tratos vigentes'));

  // Carga rápida
  const carga = h('section', { class: 'panel' }, h('h2', { text: 'Cargar' }),
    h('div', { class: 'carga-rapida' },
      h('button', { class: 'btn', onclick: async () => { if (await formMovimiento({ tipo: 'ingreso', moneda })) ruta(); } }, icono('ingreso'), 'Ingreso'),
      h('button', { class: 'btn gasto', onclick: async () => { if (await formMovimiento({ tipo: 'gasto', moneda })) ruta(); } }, icono('gasto'), 'Gasto')),
    h('p', { class: 'chico suave bloque', text: 'Los gastos mensuales y anuales se cargan una sola vez: el panel los cuenta solo hasta que les des de baja.' }));

  // Movimientos del mes (incluye los recurrentes)
  const delMes = movs.filter((m) => cuentaEnMes(m, pref)).sort((a, b) => (a.tipo === b.tipo ? String(b.fecha).localeCompare(String(a.fecha)) : a.tipo === 'ingreso' ? -1 : 1));
  const mesNav = h('div', { class: 'mes-nav' },
    h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Mes anterior', onclick: () => ir(moverMes(pref, -1), moneda) }, icono('izq')),
    h('strong', { text: nombreMes(pref) }),
    h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Mes siguiente', onclick: () => ir(moverMes(pref, 1), moneda) }, icono('der')),
    pref !== hoyPref ? h('button', { class: 'btn sec mini', text: 'Hoy', onclick: () => ir(hoyPref, moneda) }) : null);
  const pMes = h('section', { class: 'panel' },
    h('h2', {}, 'Movimientos', mesNav),
    delMes.length ? h('ul', { class: 'lista' }, delMes.map((m) => filaMovimiento(m, nombres, { pref }))) : h('p', { class: 'vacio', text: 'No hay movimientos en ' + nombreMes(pref) + '. Cargá uno con los botones de arriba.' }));

  // Gastos fijos activos
  const pFijos = h('section', { class: 'panel' },
    h('h2', { text: 'Gastos mensuales y anuales activos' }),
    fijosActivos.length ? h('ul', { class: 'lista' }, fijosActivos.sort((a, b) => b.monto / (b.frecuencia === 'anual' ? 12 : 1) - a.monto / (a.frecuencia === 'anual' ? 12 : 1)).map((m) => filaMovimiento(m, nombres))) :
      h('p', { class: 'suave', text: 'Todavía no hay gastos fijos. Cargá un gasto y elegí "Mensual" o "Anual".' }));

  // Gráficos
  const porDestino = {};
  for (const x of mesesAnio) if (!x.futuro) for (const m of movs) if (esGasto(m) && cuentaEnMes(m, x.pref)) porDestino[m.categoria] = (porDestino[m.categoria] || 0) + Number(m.monto);
  const cats = Object.entries(porDestino).sort((p, q) => q[1] - p[1]);
  const graf1 = h('section', { class: 'panel' }, h('h2', { text: 'Ingresos y gastos · ' + anio }),
    h('div', { class: 'leyenda' }, h('span', {}, h('i', { class: 'serie-ingreso' }), 'Ingresos'), h('span', {}, h('i', { class: 'serie-gasto' }), 'Gastos')),
    graficoMeses(mesesAnio, moneda));
  const graf2 = h('section', { class: 'panel' }, h('h2', { text: 'Gastos por destino · ' + anio }),
    cats.length ? graficoCategorias(cats, moneda, tot.gastos) : h('p', { class: 'vacio', text: 'Sin gastos en ' + anio + '.' }));

  // Resumen mensual y anual
  const celda = (v, clase = '') => h('td', { class: 'num ' + clase, text: plata(v, moneda) });
  const tabla = h('section', { class: 'panel tabla-env' }, h('h2', { text: 'Resumen mensual y anual · ' + anio }),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { text: 'Mes' }), ['Ingresos', 'Gastos mensuales', 'Gastos anuales', 'Gastos únicos', 'Resultado'].map((t) => h('th', { class: 'num', text: t })))),
      h('tbody', {}, mesesAnio.filter((x) => !x.futuro).map((x) => h('tr', {}, h('td', {}, h('a', { href: `#/finanzas?mes=${x.pref}&moneda=${moneda}`, text: x.largo })), celda(x.ingresos), celda(x.mensuales), celda(x.anuales), celda(x.unicos), celda(x.resultado, x.resultado >= 0 ? 'pos' : 'neg')))),
      h('tfoot', {}, h('tr', { class: 'total' }, h('td', { text: 'Total ' + anio }), celda(tot.ingresos), celda(tot.mensuales), celda(tot.anuales), celda(tot.unicos), celda(tot.resultado, tot.resultado >= 0 ? 'pos' : 'neg')))));

  const monSeg = segmento('moneda-vista', [['ARS', 'Pesos'], ['USD', 'Dólares']], moneda);
  monSeg.addEventListener('change', (ev) => ir(pref, ev.target.value));

  poner($main, 
    h('div', { class: 'encabezado' }, h('h1', { text: 'Finanzas' }), monSeg),
    monedasConDatos.length > 1 ? h('p', { class: 'suave chico bloque', text: 'Pesos y dólares se cuentan por separado, sin convertir.' }) : null,
    carga,
    kpis,
    pMes,
    h('div', { class: 'graficos bloque' }, pFijos, graf2),
    h('div', { class: 'bloque' }, graf1),
    h('div', { class: 'bloque' }, tabla));
}

// ------------------------------------------------------------------
// Gráficos
// ------------------------------------------------------------------
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
  poner(tip, h('b', { text: titulo }), ...filas.map(([color, t]) => h('div', {}, color ? h('i', { class: color }) : null, t)));
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
      s('path', { d: barra(cx - bw - 1, y(x.ingresos), bw, m.t + alto - y(x.ingresos)), fill: '#0057B8' }),
      s('path', { d: barra(cx + 1, y(x.gastos), bw, m.t + alto - y(x.gastos)), fill: '#9C4A6B' }),
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
  poner($main, 
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
