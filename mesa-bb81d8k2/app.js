// Panel Vectyo · interfaz. Todo el texto de los usuarios se pinta con textContent
// (nunca innerHTML), así nadie puede meter código en una ficha.
import { datos, MODO_DEMO } from './datos.js';

const cfg = window.VECTYO_CONFIG || {};
const $app = document.getElementById('app');
let yo = null;
const esAdmin = () => yo?.rol === 'admin';
const esUsuario = () => yo?.rol === 'usuario'; // cuenta abierta (no admin)
// Personales y compartidos (fase 2). La base es la que hace cumplir la privacidad;
// esto solo decide qué botones y listas mostrar.
const soyDueno = (c) => c?.dueno_id === yo?.id;
const soyIntegrante = (c) => c?.tipo === 'compartido' && (c.miembros_ids || []).includes(yo?.id);
const esMio = (c) => soyDueno(c) || soyIntegrante(c);
const puedoBorrarEn = (c) => esAdmin() || soyDueno(c);

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
  mapa: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M3.6 9h16.8|M3.6 15h16.8|M12 3c2.3 2.5 3.4 5.5 3.4 9s-1.1 6.5-3.4 9c-2.3-2.5-3.4-5.5-3.4-9S9.7 5.5 12 3z',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z|M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4.5 20.5c1-3.8 4-5.8 7.5-5.8s6.5 2 7.5 5.8',
  candado: 'M6 11h12v10H6z|M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  check: 'M5 12.5l4.5 4.5L19 7',
  imagen: 'M3 5h18v14H3z|M3 16l5-5 4 4 3-3 6 6|M15.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
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
  // Al volver del mail de confirmación, Supabase deja datos en la dirección: se borran.
  if (/access_token|error_description|type=signup/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
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
    // El estilo de la cuenta manda; si la base todavía no lo tiene, queda el de este dispositivo.
    await aplicarTema(yo.tema || localStorage.getItem('vy-tema'), yo.fondo_path);
    if (!sessionStorage.getItem('vy-ingreso')) { sessionStorage.setItem('vy-ingreso', '1'); datos.registrarIngreso().catch(() => {}); }
    vigilarInactividad();
    if (!yo.perfil_completo) return pantallaBienvenida();
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
  const registro = cfg.registroAbierto === false ? null :
    h('p', { class: 'chico suave pie-login' }, '¿No tenés cuenta? ', h('button', { class: 'link', type: 'button', text: 'Crear cuenta', onclick: () => pantallaRegistro() }));
  poner($app, caja(h('h1', { text: 'Panel Vectyo' }), h('p', { class: 'suave', text: 'Entrá con tu mail y contraseña.' }), form, registro));
}

function pantallaRegistro() {
  const error = h('p', { class: 'error' });
  const btn = h('button', { class: 'btn ancho', type: 'submit', text: 'Crear cuenta' });
  const pass = inp('password', '', { type: 'password', autocomplete: 'new-password', required: true, minlength: 12 });
  const pass2 = inp('password2', '', { type: 'password', autocomplete: 'new-password', required: true });
  const form = h('form', { novalidate: true },
    campo('Tu nombre', inp('nombre', '', { autocomplete: 'name', required: true, maxlength: 80 })),
    campo('Mail', inp('email', '', { type: 'email', autocomplete: 'email', required: true, inputmode: 'email' })),
    campo('Contraseña (mínimo 12, con letras, números y un símbolo)', pass),
    campo('Repetí la contraseña', pass2),
    h('p', { class: 'chico suave nota-icono' }, icono('candado'), h('span', { text: 'Después vas a activar el código de seguridad en tu celular. Sin ese código nadie entra a tu cuenta, aunque sepa la contraseña.' })),
    error, btn,
    h('button', { class: 'btn sec ancho', type: 'button', text: 'Ya tengo cuenta', onclick: () => pantallaLogin() }));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const nombre = String(fd.get('nombre')).trim(), email = String(fd.get('email')).trim(), clave = String(fd.get('password'));
    error.textContent = '';
    if (!nombre || !email || !clave) { error.textContent = 'Completá los campos obligatorios.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = 'Revisá el mail.'; return; }
    if (clave.length < 12) { error.textContent = 'La contraseña tiene que tener al menos 12 caracteres.'; pass.focus(); return; }
    if (!/[a-z]/.test(clave) || !/[A-Z]/.test(clave) || !/\d/.test(clave) || !/[^a-zA-Z0-9]/.test(clave)) { error.textContent = 'La contraseña tiene que mezclar minúsculas, mayúsculas, números y al menos un símbolo (por ejemplo ! o #).'; pass.focus(); return; }
    if (clave !== fd.get('password2')) { error.textContent = 'Las dos contraseñas no coinciden.'; pass2.focus(); return; }
    btn.disabled = true;
    try {
      const r = await datos.registrarse(nombre, email, clave);
      if (r.necesitaConfirmar) {
        poner($app, caja(h('h1', { text: 'Revisá tu mail' }),
          h('p', { class: 'suave', text: `Si ${email} no tenía cuenta, te mandamos un link para confirmarla. Tocalo y después entrá con tu mail y contraseña.` }),
          h('p', { class: 'chico suave bloque-arriba', text: 'Si no llega en unos minutos, mirá en spam o promociones.' }),
          h('form', {}, h('button', { class: 'btn ancho', type: 'button', text: 'Ir a entrar', onclick: () => pantallaLogin() }))));
      } else await iniciar();
    } catch (e) { error.textContent = e.message; btn.disabled = false; }
  });
  poner($app, caja(h('h1', { text: 'Crear cuenta' }), h('p', { class: 'suave', text: 'Lo que cargues como personal lo ven solo vos y el administrador del panel.' }), form));
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
  if (esAdmin()) l.push(['#/mapa', 'Mapa', 'mapa'], ['#/registro', 'Registro', 'registro']);
  l.push(['#/perfil', 'Perfil', 'perfil']);
  return l;
}
function armarMarco() {
  const links = secciones();
  const nav = h('nav', { class: 'nav', 'aria-label': 'Secciones' }, links.map(([href, t, ic]) => h('a', { href }, icono(ic), t)));
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Secciones' }, links.map(([href, t, ic]) => h('a', { href }, icono(ic), t)));
  $main = h('main', { id: 'contenido' });
  poner($app, 
    h('header', { class: 'barra' },
      h('a', { class: 'marca', href: '#/clientes' }, h('img', { class: 'logo-claro', src: 'isotipo-ciruela.svg', alt: '' }), h('img', { class: 'logo-oscuro', src: 'isotipo.svg', alt: '' }), 'VECTYO'),
      nav,
      h('div', { class: 'usuario' },
        h('a', { class: 'yo-mini', href: '#/perfil', title: 'Mi perfil' }, avatarPerfil(yo, 'mini'), h('span', { class: 'quien suave chico', text: yo.nombre })),
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
  if (typeof mapaPanel !== 'undefined' && mapaPanel) { try { mapaPanel.remove(); } catch { /* nada */ } mapaPanel = null; }
  const [, seccionCruda, id] = location.hash.split('?')[0].split('/');
  const seccion = seccionCruda || 'clientes';
  marcarNav();
  poner($main, h('p', { class: 'cargando', text: 'Cargando…' }));
  try {
    if (seccion === 'cliente' && id) await vistaFicha(decodeURIComponent(id));
    else if (['finanzas', 'plata', 'analytics'].includes(seccion)) await vistaFinanzas();
    else if (seccion === 'mapa' && esAdmin()) await vistaMapa();
    else if (seccion === 'registro' && esAdmin()) await vistaRegistro();
    else if (seccion === 'perfil') await vistaPerfil();
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
// Estilos de la interfaz (temas.css). Cada cuenta elige el suyo.
// ------------------------------------------------------------------
const TEMAS = [
  ['vectyo', 'Vectyo', 'Claro, con vidrio blanco, ciruela y azul. El de la marca.', 'claro', '#F4F2F5'],
  ['asal', 'Asal Design', 'Oscuro, con degradé violeta, rosa y azul, y botones blancos.', 'oscuro', '#0D0A10'],
  ['ice', 'Ice Water', 'Vidrio gris esmerilado sobre una foto desenfocada, con detalles crema.', 'oscuro', '#2A2826'],
  ['focus', 'Focus Power', 'Negro con verde neón y brillo, estilo terminal.', 'oscuro', '#040705'],
];
const temaValido = (t) => (TEMAS.some((x) => x[0] === t) ? t : 'vectyo');
async function aplicarTema(tema, fondoPath = null) {
  const t = temaValido(tema);
  const [, , , modo, color] = TEMAS.find((x) => x[0] === t);
  const raiz = document.documentElement;
  if (t === 'vectyo') { raiz.removeAttribute('data-tema'); raiz.removeAttribute('data-modo'); }
  else { raiz.setAttribute('data-tema', t); raiz.setAttribute('data-modo', modo); }
  try { localStorage.setItem('vy-tema', t); } catch { /* sin almacenamiento */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  // Foto de fondo propia (Ice Water). Se pone por CSSOM: la política de seguridad no deja estilos en línea.
  raiz.style.removeProperty('--foto-fondo');
  if (t === 'ice' && fondoPath) {
    const u = await datos.urlImagenPerfil(fondoPath).catch(() => null);
    if (u) raiz.style.setProperty('--foto-fondo', `url("${u}")`);
  }
}
// Tarjetas para elegir estilo. alElegir(tema) guarda; el cambio se ve en el momento.
function selectorTemas(alElegir) {
  const actual = temaValido(yo?.tema || localStorage.getItem('vy-tema'));
  const grilla = h('div', { class: 'temas', role: 'group', 'aria-label': 'Estilo del panel' });
  const pintar = (elegido) => poner(grilla, TEMAS.map(([id, nombre, desc]) => h('button', {
    type: 'button', class: 'tema-op', 'aria-pressed': String(id === elegido),
    onclick: async () => { pintar(id); await aplicarTema(id, yo?.fondo_path); await alElegir(id); },
  },
  h('span', { class: 'muestra', 'data-m': id, 'aria-hidden': 'true' }, h('i', { class: 'm-lat' }), h('i', { class: 'm-tit' }), h('i', { class: 'm-tar' }), h('i', { class: 'm-bot' })),
  h('strong', {}, nombre, id === elegido ? icono('check') : null),
  h('small', { text: desc }))));
  pintar(actual);
  return grilla;
}
async function guardarTema(t) {
  try { yo = { ...yo, ...await datos.guardarPerfil({ tema: t }) }; }
  catch (e) { yo = { ...yo, tema: t }; aviso(e.message, true); }
}

// ------------------------------------------------------------------
// Perfil de cuenta
// ------------------------------------------------------------------
const limpiarArroba = (u, dominio) => String(u || '').trim().replace(dominio, '').replace(/^@/, '').replace(/[/?#].*$/, '');
const REDES = [
  ['instagram', 'Instagram', '@usuario', urlInstagram],
  ['tiktok', 'TikTok', '@usuario', (u) => { const x = limpiarArroba(u, /^https?:\/\/(www\.)?tiktok\.com\/@?/i); return x ? 'https://www.tiktok.com/@' + encodeURIComponent(x) : null; }],
  ['linkedin', 'LinkedIn', 'Link a tu perfil', (u) => { const x = String(u || '').trim(); if (!x) return null; return /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(x) ? x : 'https://www.linkedin.com/in/' + encodeURIComponent(limpiarArroba(x, /^https?:\/\/[^/]+\/(in\/)?/i)); }],
  ['x', 'X (Twitter)', '@usuario', (u) => { const x = limpiarArroba(u, /^https?:\/\/(www\.)?(x|twitter)\.com\//i); return x ? 'https://x.com/' + encodeURIComponent(x) : null; }],
  ['web', 'Web', 'tusitio.com', urlWeb],
  ['whatsapp', 'WhatsApp', 'Ej: 2664639451', urlWhatsapp],
];
function edad(iso) {
  if (!iso) return null;
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  let e = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
  return e;
}
function avatarPerfil(p, tam = '') {
  const clase = 'avatar' + (tam ? ' ' + tam : '');
  const ini = h('div', { class: clase, text: iniciales(p.nombre), 'aria-hidden': 'true' });
  if (!p.foto_path) return ini;
  const img = h('img', { class: clase, alt: '' });
  datos.urlImagenPerfil(p.foto_path).then((u) => { if (u) { img.src = u; ini.replaceWith(img); } }).catch(() => {});
  return ini;
}
function bannerPerfil(p) {
  const b = h('div', { class: 'banner', 'aria-hidden': 'true' });
  if (p.banner_path) {
    const img = h('img', { alt: '' });
    datos.urlImagenPerfil(p.banner_path).then((u) => { if (u) { img.src = u; b.append(img); } }).catch(() => {});
  }
  return b;
}
async function cambiarImagen(tipo) {
  const [f] = await elegirArchivo('image/jpeg,image/png,image/webp');
  if (!f) return false;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { aviso('Usá una imagen JPG, PNG o WebP.', true); return false; }
  if (f.size > 5 * 1024 * 1024) { aviso('La imagen pesa más de 5 MB. Probá con una más chica.', true); return false; }
  const nuevo = await intentar(() => datos.subirImagenPerfil(yo, tipo, f), { banner: 'Banner actualizado.', fondo: 'Foto de fondo actualizada.' }[tipo] || 'Foto actualizada.');
  yo = { ...yo, ...nuevo };
  return true;
}
// Lee del formulario solo los campos del perfil que están en él, y los valida.
function camposPerfil(form) {
  const fd = new FormData(form), out = {};
  for (const k of ['nombre', 'usuario', 'descripcion', 'fecha_nacimiento', ...REDES.map((r) => r[0])]) {
    if (!form.elements[k]) continue;
    out[k] = String(fd.get(k) ?? '').trim() || null;
  }
  if (form.elements.mostrar_edad) out.mostrar_edad = form.elements.mostrar_edad.checked;
  if (out.usuario) out.usuario = out.usuario.replace(/^@/, '').toLowerCase();
  if ('nombre' in out && !out.nombre) throw new Error('Poné tu nombre.');
  if ('usuario' in out && !out.usuario) throw new Error('Elegí tu @usuario.');
  if (out.usuario && !/^[a-z0-9._]{3,30}$/.test(out.usuario)) throw new Error('El @usuario va de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.');
  if (out.descripcion && out.descripcion.length > 160) throw new Error('La descripción puede tener hasta 160 caracteres.');
  if (out.fecha_nacimiento) { const e = edad(out.fecha_nacimiento); if (!(e >= 13 && e <= 120)) throw new Error('La fecha de nacimiento no es válida (hay que tener al menos 13 años).'); }
  return out;
}
const campoUsuario = (v) => h('div', { class: 'con-arroba' }, h('span', { text: '@', 'aria-hidden': 'true' }),
  inp('usuario', v, { required: true, maxlength: 30, autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false', placeholder: 'tunombre', 'aria-label': 'Usuario' }));
function campoDescripcion(v) {
  const t = area('descripcion', v, { maxlength: 160, rows: 3, placeholder: 'Ej: Diseño webs para comercios de San Luis.' });
  const cuenta = h('span', { class: 'cuenta chico suave' });
  const act = () => { cuenta.textContent = `${t.value.length}/160`; };
  t.addEventListener('input', act); act();
  return h('div', { class: 'con-cuenta' }, t, cuenta);
}
const camposSobreVos = (p) => [
  campo('Descripción corta', campoDescripcion(p.descripcion), 'entera'),
  campo('Fecha de nacimiento', inp('fecha_nacimiento', p.fecha_nacimiento, { type: 'date', max: hoyISO(), min: '1900-01-01' })),
  h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'mostrar_edad', checked: p.mostrar_edad !== false }), 'Mostrar mi edad en el perfil'),
];
const camposRedes = (p) => REDES.map(([k, t, ph]) => campo(t, inp(k, p[k], { placeholder: ph, maxlength: k === 'whatsapp' ? 40 : 200, ...(k === 'whatsapp' ? { inputmode: 'tel' } : { autocapitalize: 'none', spellcheck: 'false' }) })));

// Paso a paso obligatorio la primera vez que se entra (también para las cuentas viejas).
function pantallaBienvenida(paso = 1) {
  const TOTAL = 5;
  const error = h('p', { class: 'error' });
  const progreso = h('div', { class: 'pasos', 'aria-hidden': 'true' }, Array.from({ length: TOTAL }, (_, i) => h('span', { class: i < paso ? 'hecho' : '' })));
  const ir = (n) => pantallaBienvenida(n);
  const terminar = () => { armarMarco(); location.hash = '#/perfil'; ruta(); };
  let titulo, texto, cuerpo, opcional = false;
  if (paso === 1) {
    titulo = 'Armemos tu perfil';
    texto = 'Así te van a reconocer las personas con las que compartas clientes. Lo podés cambiar cuando quieras.';
    cuerpo = h('div', { class: 'grilla-form' },
      campo('Nombre y apellido', inp('nombre', yo.nombre, { required: true, maxlength: 80, autocomplete: 'name' }), 'entera'),
      campo('Tu @usuario', campoUsuario(yo.usuario), 'entera'),
      h('p', { class: 'chico suave entera', text: 'Con tu @usuario te van a poder sumar a un cliente compartido. Va en minúscula, sin espacios.' }));
  } else if (paso === 2) {
    titulo = 'Tu foto y tu banner';
    texto = 'Una foto donde se te vea bien la cara y un banner que cuente algo de vos o de tu trabajo.';
    opcional = true;
    const subir = (tipo) => async () => { if (await cambiarImagen(tipo).catch(() => false)) ir(2); };
    cuerpo = h('div', {},
      h('div', { class: 'perfil-previa' }, bannerPerfil(yo), avatarPerfil(yo, 'grande')),
      h('div', { class: 'acciones izq' },
        h('button', { class: 'btn sec', type: 'button', onclick: subir('foto') }, icono('camara'), yo.foto_path ? 'Cambiar foto' : 'Subir foto'),
        h('button', { class: 'btn sec', type: 'button', onclick: subir('banner') }, icono('imagen'), yo.banner_path ? 'Cambiar banner' : 'Subir banner')),
      h('p', { class: 'chico suave bloque-arriba', text: 'JPG, PNG o WebP de hasta 5 MB. El banner se ve mejor horizontal (por ejemplo, 1500 × 500).' }));
  } else if (paso === 3) {
    titulo = 'Contanos de vos';
    texto = 'Una línea que diga qué hacés. La edad es opcional y la podés ocultar.';
    opcional = true;
    cuerpo = h('div', { class: 'grilla-form' }, camposSobreVos(yo));
  } else if (paso === 4) {
    titulo = 'Tus redes';
    texto = 'Completá las que uses. Se muestran como links en tu perfil.';
    opcional = true;
    cuerpo = h('div', { class: 'grilla-form' }, camposRedes(yo));
  } else {
    titulo = 'Elegí tu estilo';
    texto = 'Así se va a ver tu panel. Tocá uno para probarlo; lo podés cambiar cuando quieras desde tu perfil.';
    cuerpo = selectorTemas(guardarTema);
  }
  const ultimo = paso === TOTAL;
  const btn = h('button', { class: 'btn', type: 'submit', text: ultimo ? 'Terminar' : 'Siguiente' });
  const form = h('form', { novalidate: true }, cuerpo, error,
    h('div', { class: 'acciones' },
      paso > 1 ? h('button', { class: 'btn sec', type: 'button', text: 'Atrás', onclick: () => ir(paso - 1) }) : null,
      opcional && !ultimo ? h('button', { class: 'btn sec', type: 'button', text: 'Después', onclick: () => ir(paso + 1) }) : null,
      btn));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error.textContent = '';
    btn.disabled = true;
    try {
      const campos = paso === 2 || paso === 5 ? {} : camposPerfil(form);
      if (ultimo) campos.perfil_completo = true;
      if (Object.keys(campos).length) yo = { ...yo, ...await datos.guardarPerfil(campos) };
      if (ultimo) { terminar(); aviso('¡Listo! Tu perfil quedó armado.'); } else ir(paso + 1);
    } catch (e) { error.textContent = e.message; btn.disabled = false; }
  });
  poner($app, h('div', { class: 'login' }, h('div', { class: 'panel bienvenida' + (paso === 5 ? ' ancha' : '') },
    progreso, h('p', { class: 'chico suave paso', text: `Paso ${paso} de ${TOTAL}` }),
    h('h1', { text: titulo }), h('p', { class: 'suave', text: texto }), form,
    h('p', { class: 'pie-login' }, h('button', { class: 'link chico', type: 'button', text: 'Salir', onclick: () => salir() })))));
  const primero = form.querySelector('input:not([type=checkbox]), textarea');
  if (primero && matchMedia('(min-width: 700px)').matches) primero.focus();
}

function formPerfil() {
  const grupo = (titulo, ...campos) => h('fieldset', { class: 'grupo' }, h('legend', { text: titulo }), h('div', { class: 'grilla-form' }, ...campos));
  const cuerpo = h('div', { class: 'grupos' },
    grupo('Quién sos',
      campo('Nombre y apellido *', inp('nombre', yo.nombre, { required: true, maxlength: 80 })),
      campo('@usuario *', campoUsuario(yo.usuario))),
    grupo('Sobre vos', ...camposSobreVos(yo)),
    grupo('Redes', ...camposRedes(yo)));
  return dialogo({
    titulo: 'Editar perfil', cuerpo,
    alGuardar: async (_fd, form) => { yo = { ...yo, ...await datos.guardarPerfil(camposPerfil(form)) }; aviso('Perfil guardado.'); return yo; },
  });
}

function panelEstilo() {
  const extra = h('div');
  const pintarExtra = () => {
    if (temaValido(yo.tema || localStorage.getItem('vy-tema')) !== 'ice') return poner(extra);
    poner(extra, h('div', { class: 'fondo-propio' },
      h('p', { class: 'chico suave', text: yo.fondo_path ? 'Fondo: tu foto (solo la ves vos).' : 'Fondo: la foto de Vectyo. Podés poner una tuya; se desenfoca sola y solo la ves vos.' }),
      h('button', { class: 'btn sec mini', onclick: async () => {
        if (await cambiarImagen('fondo').catch(() => false)) { await aplicarTema('ice', yo.fondo_path); pintarExtra(); }
      } }, icono('imagen'), yo.fondo_path ? 'Cambiar mi foto' : 'Subir mi foto'),
      yo.fondo_path ? h('button', { class: 'btn sec mini', text: 'Usar la de Vectyo', onclick: async () => {
        await intentar(async () => { yo = { ...yo, ...await datos.guardarPerfil({ fondo_path: null }) }; }, 'Volviste a la foto de Vectyo.').catch(() => {});
        await aplicarTema('ice', null); pintarExtra();
      } }) : null));
  };
  pintarExtra();
  return h('section', { class: 'panel' }, h('h2', {}, icono('imagen'), 'Estilo del panel'),
    h('p', { class: 'suave chico bloque-abajo', text: 'Elegí cómo se ve tu panel. Se guarda en tu cuenta y te sigue en la compu y en el celular. Los demás no ven tu elección.' }),
    selectorTemas(async (t) => { await guardarTema(t); pintarExtra(); armarMarcoSinPerder(); }),
    extra);
}
// Rehace el menú (logo claro u oscuro) sin recargar la vista actual.
function armarMarcoSinPerder() {
  const contenido = $main ? [...$main.childNodes] : [];
  armarMarco();
  poner($main, contenido);
  marcarNav();
}

async function vistaPerfil() {
  const recargar = () => { armarMarco(); ruta(); };
  const e = yo.mostrar_edad !== false ? edad(yo.fecha_nacimiento) : null;
  const redes = REDES.map(([k, t, , url]) => { const u = url(yo[k]); return u ? h('a', { class: 'enlace', href: u, target: '_blank', rel: 'noopener noreferrer', text: t }) : null; }).filter(Boolean);
  const ROL = { admin: 'Administrador', equipo: 'Equipo Vectyo', usuario: 'Cuenta personal' };
  const subir = (tipo) => async () => { if (await cambiarImagen(tipo).catch(() => false)) recargar(); };
  poner($main,
    h('div', { class: 'encabezado' }, h('h1', { text: 'Mi perfil' }),
      h('button', { class: 'btn', onclick: async () => { if (await formPerfil()) recargar(); } }, icono('editar'), 'Editar perfil')),
    h('section', { class: 'perfil vidrio' },
      h('div', { class: 'perfil-banner' }, bannerPerfil(yo),
        h('button', { class: 'btn sec mini cambiar-banner', onclick: subir('banner') }, icono('imagen'), 'Cambiar banner')),
      h('div', { class: 'perfil-cuerpo' },
        h('div', { class: 'foto-cambiar' }, avatarPerfil(yo, 'grande'),
          h('button', { class: 'btn sec btn-icono', 'aria-label': 'Cambiar foto', title: 'Cambiar foto', onclick: subir('foto') }, icono('camara'))),
        h('div', { class: 'perfil-info' },
          h('h2', { class: 'perfil-nombre', text: yo.nombre }),
          h('p', { class: 'suave' }, yo.usuario ? '@' + yo.usuario : 'Sin @usuario', e != null ? ` · ${e} años` : '', ' ', h('span', { class: 'chip', text: ROL[yo.rol] || yo.rol })),
          h('p', { class: 'texto-largo' + (yo.descripcion ? '' : ' suave'), text: yo.descripcion || 'Todavía no escribiste una descripción.' }),
          redes.length ? h('div', { class: 'enlaces' }, redes) : h('p', { class: 'chico suave', text: 'Sin redes cargadas.' })))),
    panelEstilo(),
    h('section', { class: 'panel' }, h('h2', {}, icono('candado'), 'Quién ve tu perfil'),
      h('p', { class: 'suave', text: 'Tu perfil lo ven las personas con las que compartas un cliente y el administrador del panel. No es público ni aparece en la web.' })),
    null);
}

// ------------------------------------------------------------------
// Clientes
// ------------------------------------------------------------------
// Etiqueta de privacidad de un cliente (tarjeta y ficha)
function chipTipo(c, nombres = {}) {
  if (c.tipo === 'compartido') {
    const n = (c.miembros_ids || []).length;
    return h('span', { class: 'chip tipo compartido' }, icono('clientes'), 'Compartido' + (n > 1 ? ' · ' + n : ''));
  }
  const ajeno = !soyDueno(c);
  return h('span', { class: 'chip tipo personal' + (ajeno ? ' ajeno' : '') }, icono('candado'), ajeno ? 'Personal de ' + (nombres[c.dueno_id] || 'otra cuenta') : 'Personal');
}

async function vistaClientes() {
  const [todos, mias] = await Promise.all([datos.listarClientes(), datos.listarMisTareas().catch(() => [])]);
  // El admin también recibe los clientes de las demás cuentas: se muestran solo si lo pide.
  const hayAjenos = esAdmin() && todos.some((c) => !esMio(c));
  const nombres = hayAjenos ? Object.fromEntries((await datos.listarPerfiles()).map((p) => [p.id, p.nombre])) : {};
  const buscar = inp('q', '', { type: 'search', placeholder: 'Buscar por nombre, rubro o ciudad', 'aria-label': 'Buscar' });
  const etapa = sel('etapa', [['', 'Todas las etapas'], ...ETAPAS], '', { 'aria-label': 'Etapa' });
  const tipo = segmento('tipo-vista', [['', 'Todos'], ['personal', 'Personales'], ['compartido', 'Compartidos']], sessionStorage.getItem('vy-tipo') || '');
  const verAjenos = hayAjenos ? h('input', { type: 'checkbox', checked: sessionStorage.getItem('vy-ajenos') === '1' }) : null;
  const grilla = h('div', { class: 'tarjetas' });
  const cuenta = h('span', { class: 'suave chico' });
  function pintar() {
    const q = buscar.value.trim().toLowerCase();
    const t = tipo.querySelector('input:checked')?.value || '';
    sessionStorage.setItem('vy-tipo', t);
    if (verAjenos) sessionStorage.setItem('vy-ajenos', verAjenos.checked ? '1' : '0');
    const base = todos.filter((c) => esMio(c) || verAjenos?.checked);
    const lista = base.filter((c) => (!etapa.value || c.etapa === etapa.value) && (!t || c.tipo === t) &&
      (!q || [c.nombre, c.rubro, c.ciudad, c.contacto].join(' ').toLowerCase().includes(q)));
    cuenta.textContent = base.length + (base.length === 1 ? ' cliente' : ' clientes');
    poner(grilla, ...lista.map((c) => h('a', { class: 'tarjeta' + (esMio(c) ? '' : ' ajena'), href: '#/cliente/' + encodeURIComponent(c.id) },
      avatar(c), h('span', { class: 'nombre', text: c.nombre }), h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }), chipTipo(c, nombres))));
    if (!lista.length) poner(grilla, h('p', { class: 'vacio', text: base.length ? 'No hay clientes con ese filtro.' : 'Todavía no tenés clientes. Tocá "Nuevo cliente". Si alguien te suma a un cliente compartido, también aparece acá.' }));
  }
  buscar.addEventListener('input', pintar);
  etapa.addEventListener('change', pintar);
  tipo.addEventListener('change', pintar);
  verAjenos?.addEventListener('change', pintar);
  pintar();
  poner($main,
    h('div', { class: 'encabezado' }, h('h1', { text: 'Clientes' }), cuenta,
      h('button', { class: 'btn', onclick: async () => { const c = await formCliente(); if (c) location.hash = '#/cliente/' + c.id; } }, icono('mas'), 'Nuevo cliente')),
    panelMisTareas(mias),
    h('div', { class: 'filtros' }, tipo, buscar, etapa,
      verAjenos ? h('label', { class: 'check chico' }, verAjenos, 'Ver también los de otras cuentas (admin)') : null),
    grilla);
}

function formCliente(c = {}, { integrantes = [] } = {}) {
  const servs = new Set(c.servicios || []);
  const nuevo = !c.id;
  const notaTipo = h('p', { class: 'chico suave entera' });
  const tipoSeg = nuevo ? segmento('tipo', [['personal', 'Personal'], ['compartido', 'Compartido']], 'personal') : null;
  const explicarTipo = () => {
    const t = tipoSeg.querySelector('input:checked')?.value;
    notaTipo.textContent = t === 'compartido'
      ? 'Un trato con otras personas: después de guardarlo sumás a los integrantes por su @usuario o mail. Lo ven ustedes y el administrador del panel.'
      : 'Es tuyo: lo ves solo vos y el administrador del panel. Más adelante lo podés convertir en compartido.';
  };
  if (tipoSeg) { tipoSeg.addEventListener('change', explicarTipo); explicarTipo(); }
  // Responsable: quien está a cargo. En un compartido se elige entre los integrantes.
  const opcionesResp = [...new Set([...(integrantes.length ? integrantes.map((x) => x.nombre) : [yo.nombre]), c.responsable].filter(Boolean))];
  const extras = [...servs].filter((x) => !SERVICIOS.includes(x));
  const grupo = (titulo, ...campos) => h('fieldset', { class: 'grupo' }, h('legend', { text: titulo }), h('div', { class: 'grilla-form' }, ...campos));
  const cuerpo = h('div', { class: 'grupos' },
    nuevo ? grupo('¿De quién es?', h('div', { class: 'entera' }, tipoSeg), notaTipo) : null,
    grupo('Negocio',
      campo('Nombre del negocio *', inp('nombre', c.nombre, { required: true, maxlength: 200 }), 'entera'),
      campo('Rubro', inp('rubro', c.rubro, { placeholder: 'Ej: Panadería' })),
      campo('Ciudad', inp('ciudad', c.ciudad, { placeholder: 'Ej: San Luis' })),
      campo('Cómo nos conoció', inp('origen', c.origen, { placeholder: 'Instagram, referido…' }), 'entera')),
    grupo('Contacto',
      campo('Persona de contacto', inp('contacto', c.contacto)),
      campo('WhatsApp', inp('whatsapp', c.whatsapp, { inputmode: 'tel', placeholder: 'Ej: 2664639451' })),
      campo('Mail', inp('email', c.email, { type: 'email', inputmode: 'email', placeholder: 'nombre@negocio.com' })),
      campo('Instagram', inp('instagram', c.instagram, { placeholder: '@usuario' })),
      campo('Web', inp('web', c.web, { placeholder: 'negocio.com' }), 'entera')),
    grupo('Seguimiento',
      campo('Etapa', sel('etapa', ETAPAS, c.etapa || 'consulta')),
      campo('Responsable', sel('responsable', opcionesResp, c.responsable || yo.nombre)),
      campo('Próxima acción', inp('proxima_accion', c.proxima_accion, { placeholder: 'Qué hay que hacer' })),
      campo('Para cuándo', inp('fecha_proxima_accion', c.fecha_proxima_accion, { type: 'date' }))),
    grupo('Servicios que le hacemos',
      h('div', { class: 'chips entera' }, [...SERVICIOS, ...extras].map((sv) => h('label', {}, h('input', { type: 'checkbox', name: 'servicios', value: sv, checked: servs.has(sv) }), h('span', { text: sv }))))),
    grupo('Cómo es y cómo le gusta trabajar',
      campo('Personalidad', area('personalidad', c.personalidad, { placeholder: 'Ej: detallista, decide rápido, le importa el precio…' }), 'entera'),
      campo('Forma de trabajar que le gusta', area('forma_trabajo', c.forma_trabajo, { placeholder: 'Ej: prefiere audios, reuniones cortas, todo por escrito…' }), 'entera'),
      campo('Canal preferido', inp('canal_preferido', c.canal_preferido, { placeholder: 'WhatsApp, mail, llamada…' })),
      campo('Horarios', inp('horarios', c.horarios, { placeholder: 'Cuándo conviene escribirle' })),
      campo('Cosas a evitar', area('evitar', c.evitar, { rows: 2 }), 'entera')),
    grupo('Notas', campo('Notas internas', area('notas', c.notas), 'entera')));
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
      else fila.tipo = fd.get('tipo') === 'compartido' ? 'compartido' : 'personal';
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
  if (!c) throw new Error('No se encontró ese cliente, o no tenés acceso.');
  const compartido = c.tipo === 'compartido';
  const [integrantes, tareas, feed] = compartido
    ? await Promise.all([datos.listarIntegrantes(id), datos.listarTareas(id), datos.listarFeed(id)])
    : [[], [], []];
  const nombreDueno = soyDueno(c) ? yo.nombre : (integrantes.find((x) => x.usuario_id === c.dueno_id)?.nombre
    || (esAdmin() ? (await datos.listarPerfiles()).find((p) => p.id === c.dueno_id)?.nombre : null) || 'otra cuenta');
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
    h('button', { class: 'btn sec', onclick: async () => { if (await formCliente(c, { integrantes })) recargar(); } }, icono('editar'), 'Editar'),
  ];
  const enlaces = [
    urlInstagram(c.instagram) && h('a', { class: 'enlace', href: urlInstagram(c.instagram), target: '_blank', rel: 'noopener noreferrer', text: 'Instagram' }),
    urlWeb(c.web) && h('a', { class: 'enlace', href: urlWeb(c.web), target: '_blank', rel: 'noopener noreferrer' }, icono('web'), 'Web'),
    c.email && h('a', { class: 'enlace', href: 'mailto:' + c.email }, icono('mail'), c.email),
  ].filter(Boolean);
  const cab = h('div', { class: 'ficha-cab vidrio' }, fotoBox,
    h('div', { class: 'info' },
      h('h1', { text: c.nombre }),
      h('div', {}, chipTipo(c, { [c.dueno_id]: nombreDueno }), ' ', h('span', { class: 'chip etapa-' + c.etapa, text: nombreEtapa(c.etapa) }), ' ',
        (c.servicios || []).map((sv) => [h('span', { class: 'chip', text: sv }), ' '])),
      h('div', { class: 'botones' }, links),
      enlaces.length ? h('div', { class: 'enlaces' }, enlaces) : null,
      h('div', { class: 'botones' },
        puedoBorrarEn(c) && h('button', { class: 'btn peligro mini borrar-cliente', onclick: async () => {
          if (!await confirmar('¿Borrar ' + c.nombre + '?', 'Se borra la ficha con su historial, tratos y PDF' + (c.tipo === 'compartido' ? ', también para los demás integrantes' : '') + '. Los pagos quedan en Finanzas, sin cliente. No se puede deshacer.')) return;
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
      fila('Alta', fechaLinda(c.creado_en)),
      esAdmin() && fila('Mapa de la web', [c.mapa_publicar ? `Se muestra en ${[c.mapa_ciudad, c.mapa_pais].filter(Boolean).join(', ')} ` : 'No se muestra ',
        h('a', { class: 'btn sec mini', href: '#/mapa?cliente=' + encodeURIComponent(c.id) }, icono('pin'), c.mapa_publicar ? 'Mover' : 'Ubicar en el mapa')])));

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
    return h('li', { class: 'li-trato' },
      h('div', { class: 'cuerpo' },
        h('p', { class: 'trato-cab' }, h('strong', { text: a.concepto }), h('span', { class: 'monto', text: plata(a.monto, a.moneda) + (a.tipo === 'mensual' ? ' /mes' : '') })),
        h('p', { class: 'chico suave', text: [TIPO_ACUERDO[a.tipo], 'desde ' + fechaLinda(a.fecha), a.estado !== 'vigente' ? a.estado : null, a.condiciones].filter(Boolean).join(' · ') }),
        h('p', { class: 'chico' }, 'Cobrado ' + plata(cobrado, a.moneda) + ' · ', detalle)),
      h('div', { class: 'acciones-li' },
        h('button', { class: 'btn sec mini', onclick: async () => { if (await formAcuerdo(c, a)) recargar(); } }, icono('editar'), 'Editar'),
        puedoBorrarEn(c) && h('button', { class: 'btn peligro mini btn-icono', 'aria-label': 'Borrar trato', title: 'Borrar trato', onclick: async () => {
          if (!await confirmar('¿Borrar el trato?', 'Se borra "' + a.concepto + '". Los pagos ya cargados quedan.')) return;
          await intentar(() => datos.borrarAcuerdo(a.id), 'Trato borrado.'); recargar();
        } }, icono('borrar'))));
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
      puedoBorrarEn(c) && h('button', { class: 'btn peligro mini', text: 'Borrar', 'aria-label': 'Borrar ' + a.nombre, onclick: async () => {
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
      puedoBorrarEn(c) && h('button', { class: 'btn peligro mini', text: '×', 'aria-label': 'Borrar entrada', onclick: async () => {
        if (!await confirmar('¿Borrar esta entrada?', x.texto.slice(0, 140))) return;
        await intentar(() => datos.borrarHistorial(x.id)); recargar();
      } })))) : h('p', { class: 'suave bloque', text: 'Sin novedades cargadas.' }));

  const pNotas = c.notas ? h('section', { class: 'panel' }, h('h2', { text: 'Notas' }), h('p', { class: 'texto-largo', text: c.notas })) : null;

  poner($main, 
    h('a', { class: 'volver', href: '#/clientes' }, icono('volver'), 'Clientes'),
    cab,
    compartido ? h('div', { class: 'trabajo-grupo' },
      panelAporte(tareas, integrantes),
      h('div', { class: 'ficha-columnas' }, panelTareas(c, integrantes, tareas, recargar), panelFeed(feed, integrantes))) : null,
    h('div', { class: 'ficha-columnas' },
      h('div', { class: 'columna' }, panelPrivacidad(c, integrantes, nombreDueno, recargar), pPersona, pDatos, pNotas),
      h('div', { class: 'columna' }, pPlata, pArchivos, pHistorial)));
}

// Privacidad del cliente: quién lo ve, integrantes y cambio personal ↔ compartido.
function panelPrivacidad(c, integrantes, nombreDueno, recargar) {
  const dueno = soyDueno(c);
  const cambiarTipo = async (tipo) => {
    const ok = tipo === 'compartido'
      ? await dialogo({ titulo: 'Convertir en compartido', textoGuardar: 'Convertir',
          cuerpo: h('p', { class: 'suave', text: 'Vas a poder sumar integrantes por su @usuario o mail. Van a ver y trabajar todo el cliente: datos, historial, tratos, pagos y PDF. Vos seguís siendo el dueño.' }),
          alGuardar: () => datos.guardarCliente({ id: c.id, tipo: 'compartido' }) })
      : await dialogo({ titulo: 'Volver a personal', textoGuardar: 'Volver a personal', peligro: true,
          cuerpo: h('p', { class: 'suave', text: `Los demás integrantes (${Math.max(0, integrantes.length - 1)}) dejan de verlo en el momento. Lo que cargaron queda en la ficha.` }),
          alGuardar: () => datos.guardarCliente({ id: c.id, tipo: 'personal' }) });
    if (ok) { aviso(tipo === 'compartido' ? 'Ahora es compartido. Sumá a los integrantes.' : 'Volvió a ser personal.'); recargar(); }
  };
  if (c.tipo !== 'compartido') {
    return h('section', { class: 'panel privacidad' }, h('h2', {}, icono('candado'), 'Personal'),
      h('p', { class: 'suave', text: dueno ? 'Este cliente lo ves solo vos y el administrador del panel.' : `Es un cliente personal de ${nombreDueno}. Lo ves porque sos administrador del panel.` }),
      dueno ? h('div', { class: 'acciones izq' }, h('button', { class: 'btn sec mini', onclick: () => cambiarTipo('compartido') }, icono('clientes'), 'Convertir en compartido')) : null);
  }
  const lista = h('ul', { class: 'lista integrantes' }, integrantes.map((m) => {
    const esDueno = m.rol === 'dueno', soyYo = m.usuario_id === yo.id;
    return h('li', {},
      avatarPerfil(m, 'mini'),
      h('div', { class: 'cuerpo' }, h('p', {}, h('strong', { text: m.nombre + (soyYo ? ' (vos)' : '') })),
        h('p', { class: 'chico suave', text: [m.usuario ? '@' + m.usuario : null, esDueno ? 'Dueño' : 'Integrante'].filter(Boolean).join(' · ') })),
      !esDueno && (dueno || esAdmin()) && !soyYo ? h('button', { class: 'btn peligro mini', text: 'Sacar', 'aria-label': 'Sacar a ' + m.nombre, onclick: async () => {
        if (!await confirmar('¿Sacar a ' + m.nombre + '?', 'Deja de ver este cliente en el momento. Lo que cargó queda en la ficha.', 'Sí, sacar')) return;
        await intentar(() => datos.quitarIntegrante(c.id, m.usuario_id), 'Integrante sacado.'); recargar();
      } }) : null);
  }));
  let sumar = null;
  if (dueno || esAdmin()) {
    const quien = inp('buscado', '', { placeholder: '@usuario o mail', autocapitalize: 'none', spellcheck: 'false', 'aria-label': '@usuario o mail de la persona' });
    sumar = h('form', { class: 'sumar-integrante' }, quien, h('button', { class: 'btn mini', type: 'submit' }, icono('mas'), 'Sumar'));
    sumar.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!quien.value.trim()) return quien.focus();
      const r = await intentar(() => datos.agregarIntegrante(c.id, quien.value.trim())).catch(() => null);
      if (r) { aviso(r.nombre + ' ahora es integrante.'); recargar(); }
    });
  }
  return h('section', { class: 'panel privacidad' }, h('h2', {}, icono('clientes'), 'Compartido'),
    h('p', { class: 'suave chico', text: 'Lo ven y lo trabajan sus integrantes y el administrador del panel. Nadie más.' }),
    lista, sumar,
    sumar ? h('p', { class: 'chico suave', text: 'La persona tiene que tener cuenta en el panel. Pedile su @usuario (está en su perfil).' }) : null,
    h('div', { class: 'acciones izq' },
      dueno ? h('button', { class: 'btn peligro mini', onclick: () => cambiarTipo('personal') }, 'Volver a personal') : null,
      !dueno && soyIntegrante(c) ? h('button', { class: 'btn peligro mini', onclick: async () => {
        if (!await confirmar('¿Salir de ' + c.nombre + '?', 'Dejás de verlo en el momento. Para volver, el dueño te tiene que sumar de nuevo.', 'Sí, salir')) return;
        await intentar(() => datos.quitarIntegrante(c.id, yo.id), 'Saliste del cliente.');
        location.hash = '#/clientes';
      } }, 'Salir de este cliente') : null));
}

// ------------------------------------------------------------------
// Trabajo en grupo (clientes compartidos): tareas, feed y aporte semanal
// ------------------------------------------------------------------
// Importancia = puntos. Los puntos son de quien completa la tarea, en la semana
// (lunes a domingo) en que la completó. La base pone quién y cuándo.
const IMPORTANCIA = [[1, 'Baja'], [2, 'Media'], [3, 'Alta'], [5, 'Crítica']];
const nombreImportancia = (n) => (IMPORTANCIA.find((x) => x[0] === Number(n)) || [n, ''])[1];
// Colores por integrante (validados para daltonismo). Siguen a la
// persona por su orden de entrada al cliente, nunca por el puesto en el ranking.
// Cada estilo define sus 4 colores en temas.css (--int-1 a --int-4), validados contra su fondo.
const COLORES_INTEGRANTES = ['var(--int-1)', 'var(--int-2)', 'var(--int-3)', 'var(--int-4)'];
const COLOR_OTROS = 'var(--int-otros)';
function inicioSemana(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fechaCorta = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
function haceCuanto(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`;
  if (min < 7 * 24 * 60) { const d = Math.round(min / 1440); return d === 1 ? 'ayer' : `hace ${d} días`; }
  return fechaLinda(iso);
}
const chipImportancia = (n, prefijo = '') => h('span', { class: 'chip imp imp-' + n, text: `${prefijo}${nombreImportancia(n)} · ${n} ${Number(n) === 1 ? 'pt' : 'pts'}` });

function formTarea(c, integrantes, t = {}) {
  const hecha = t.estado === 'hecha';
  const opcionesAsignar = [['', 'Sin asignar (la toma quien pueda)'], ...integrantes.map((m) => [m.usuario_id, m.nombre + (m.usuario_id === yo.id ? ' (vos)' : '')])];
  const cuerpo = h('div', { class: 'grilla-form' },
    campo('Qué hay que hacer *', inp('titulo', t.titulo, { required: true, maxlength: 200, placeholder: 'Ej: Diseñar el logo en 3 versiones' }), 'entera'),
    campo('Detalle', area('detalle', t.detalle, { rows: 2, maxlength: 2000, placeholder: 'Opcional: links, criterios, a quién preguntar…' }), 'entera'),
    h('div', { class: 'campo entera' }, h('span', { class: 'suave chico', text: 'Importancia (son los puntos que suma al completarla)' }),
      segmento('importancia', IMPORTANCIA.map(([v, n]) => [v, `${n} · ${v}`]), t.importancia || 2, 'importancia')),
    campo('Asignada a', sel('asignada_a', opcionesAsignar, t.asignada_a || '')),
    campo('Para cuándo', inp('vence', t.vence, { type: 'date' })),
    hecha ? h('p', { class: 'chico suave entera', text: 'Ya está hecha: la importancia y la asignación no se cambian, para no mover puntos ya ganados.' }) : null);
  if (hecha) cuerpo.querySelectorAll('[name=importancia], [name=asignada_a]').forEach((x) => { x.disabled = true; });
  return dialogo({
    titulo: t.id ? 'Editar tarea' : 'Nueva tarea en ' + c.nombre, cuerpo,
    alGuardar: async (fd) => {
      const fila = { titulo: String(fd.get('titulo') || '').trim(), detalle: String(fd.get('detalle') || '').trim() || null, vence: fd.get('vence') || null };
      if (!fila.titulo) throw new Error('Escribí qué hay que hacer.');
      if (!hecha) { fila.importancia = Number(fd.get('importancia') || 2); fila.asignada_a = fd.get('asignada_a') || null; }
      if (t.id) fila.id = t.id; else fila.cliente_id = c.id;
      await datos.guardarTarea(fila);
      aviso(t.id ? 'Tarea guardada.' : 'Tarea creada.');
    },
  });
}

// Barra de aporte: puntos por integrante en una semana.
function panelAporte(tareas, integrantes) {
  const colorDe = new Map(integrantes.map((m, i) => [m.usuario_id, i < COLORES_INTEGRANTES.length ? COLORES_INTEGRANTES[i] : COLOR_OTROS]));
  const nombreDe = (id) => integrantes.find((m) => m.usuario_id === id)?.nombre || 'Ex integrante';
  let inicio = inicioSemana();
  const cont = h('div', { class: 'aporte-cuerpo' });
  const titulo = h('strong', { class: 'semana' });
  const sig = h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Semana siguiente', onclick: () => { inicio = sumarDias(inicio, 7); pintar(); } }, icono('der'));
  function pintar() {
    const fin = sumarDias(inicio, 7);
    const esEsta = +inicio === +inicioSemana();
    titulo.textContent = (esEsta ? 'Esta semana' : 'Semana') + ` · ${fechaCorta(inicio)} al ${fechaCorta(sumarDias(fin, -1))}`;
    sig.disabled = esEsta;
    const porPersona = new Map();
    for (const t of tareas) {
      if (t.estado !== 'hecha' || !t.completada_en) continue;
      const d = new Date(t.completada_en);
      if (d < inicio || d >= fin) continue;
      const x = porPersona.get(t.completada_por) || { id: t.completada_por, puntos: 0, tareas: 0 };
      x.puntos += Number(t.importancia); x.tareas += 1;
      porPersona.set(t.completada_por, x);
    }
    // Todos los integrantes aparecen (también con 0), en su orden fijo; después los ex integrantes.
    const filas = [...integrantes.map((m) => porPersona.get(m.usuario_id) || { id: m.usuario_id, puntos: 0, tareas: 0 }),
      ...[...porPersona.values()].filter((x) => !colorDe.has(x.id))];
    const total = filas.reduce((s, x) => s + x.puntos, 0);
    const pct = (x) => (total ? Math.round(x.puntos / total * 100) : 0);
    if (!total) {
      poner(cont, h('div', { class: 'barra-aporte vacia' }), h('p', { class: 'suave chico', text: esEsta ? 'Todavía nadie completó tareas esta semana.' : 'Esa semana no se completaron tareas.' }));
      return;
    }
    const max = Math.max(...filas.map((x) => x.puntos));
    const lideres = filas.filter((x) => x.puntos === max);
    const titular = lideres.length > 1
      ? `Empate: ${lideres.map((x) => nombreDe(x.id)).join(' y ')} con ${max} pts cada uno`
      : `${esEsta ? 'Va aportando más' : 'Aportó más'}: ${nombreDe(lideres[0].id)} · ${max} pts (${pct(lideres[0])}%)`;
    const tip = h('div', { class: 'tip-aporte', role: 'tooltip', hidden: true });
    const barra = h('div', { class: 'barra-aporte', role: 'img', 'aria-label': filas.filter((x) => x.puntos).map((x) => `${nombreDe(x.id)} ${x.puntos} pts`).join(', ') },
      filas.filter((x) => x.puntos).map((x) => {
        // Estilos por CSSOM (la política de seguridad no deja usar el atributo style).
        const seg = h('span', { class: 'seg', tabindex: 0 });
        seg.style.flexGrow = String(x.puntos); seg.style.background = colorDe.get(x.id) || COLOR_OTROS;
        const mostrar = () => { tip.textContent = `${nombreDe(x.id)}: ${x.puntos} pts · ${x.tareas} ${x.tareas === 1 ? 'tarea' : 'tareas'} · ${pct(x)}%`; tip.hidden = false; tip.style.left = (seg.offsetLeft + seg.offsetWidth / 2) + 'px'; };
        seg.addEventListener('pointerenter', mostrar); seg.addEventListener('focus', mostrar);
        seg.addEventListener('pointerleave', () => { tip.hidden = true; }); seg.addEventListener('blur', () => { tip.hidden = true; });
        return seg;
      }));
    const muestra = (id) => { const i = h('i'); i.style.background = colorDe.get(id) || COLOR_OTROS; return i; };
    const leyenda = h('ul', { class: 'leyenda-aporte' }, filas.map((x) => h('li', {},
      muestra(x.id),
      h('span', { class: 'quien', text: nombreDe(x.id) + (x.id === yo.id ? ' (vos)' : '') }),
      h('span', { class: 'mono', text: `${x.puntos} pts` }),
      h('span', { class: 'suave chico', text: `${x.tareas} ${x.tareas === 1 ? 'tarea' : 'tareas'} · ${pct(x)}%` }))));
    poner(cont, h('p', { class: 'titular-aporte', text: titular }), h('div', { class: 'barra-env' }, barra, tip), leyenda);
  }
  pintar();
  return h('section', { class: 'panel aporte' },
    h('h2', {}, 'Aporte de la semana',
      h('span', { class: 'mes-nav' },
        h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Semana anterior', onclick: () => { inicio = sumarDias(inicio, -7); pintar(); } }, icono('izq')),
        titulo, sig)),
    cont,
    h('p', { class: 'chico suave bloque', text: 'Cada tarea completada suma su importancia (Baja 1, Media 2, Alta 3, Crítica 5) a quien la completó. La semana va de lunes a domingo.' }));
}

function panelTareas(c, integrantes, tareas, recargar) {
  const nombreDe = (id) => integrantes.find((m) => m.usuario_id === id)?.nombre || 'Ex integrante';
  const perfilDe = (id) => integrantes.find((m) => m.usuario_id === id) || { nombre: '?' };
  let filtro = sessionStorage.getItem('vy-filtro-tareas') || 'pendientes';
  const lista = h('ul', { class: 'lista tareas' });
  const pend = tareas.filter((t) => t.estado === 'pendiente');
  const seg = segmento('filtro-tareas', [['pendientes', `Pendientes (${pend.length})`], ['mias', `Mías (${pend.filter((t) => t.asignada_a === yo.id).length})`], ['hechas', 'Hechas']], filtro);
  seg.addEventListener('change', (ev) => { filtro = ev.target.value; sessionStorage.setItem('vy-filtro-tareas', filtro); pintar(); });
  const hoy = hoyISO();
  function fila(t) {
    const hecha = t.estado === 'hecha';
    const puedeCompletar = !hecha && (!t.asignada_a || t.asignada_a === yo.id);
    const puedeReabrir = hecha && (t.completada_por === yo.id || soyDueno(c) || esAdmin());
    const puedeBorrar = (t.creado_por === yo.id && !hecha) || soyDueno(c) || esAdmin();
    const vencida = !hecha && t.vence && t.vence < hoy;
    const check = h('button', { class: 'check-tarea' + (hecha ? ' hecha' : ''), type: 'button', disabled: !puedeCompletar && !hecha,
      'aria-label': hecha ? 'Hecha' : puedeCompletar ? 'Marcar como hecha: ' + t.titulo : 'Asignada a ' + nombreDe(t.asignada_a),
      title: hecha ? 'Hecha' : puedeCompletar ? 'Marcar como hecha' : 'La completa ' + nombreDe(t.asignada_a),
      onclick: hecha ? null : async () => { await intentar(() => datos.completarTarea(t.id), `¡Hecha! +${t.importancia} ${t.importancia === 1 ? 'punto' : 'puntos'}`).catch(() => {}); recargar(); } }, icono('check'));
    return h('li', { class: hecha ? 'hecha' : '' }, check,
      h('div', { class: 'cuerpo' },
        h('p', {}, h('strong', { text: t.titulo })),
        t.detalle ? h('p', { class: 'chico suave texto-largo', text: t.detalle }) : null,
        h('p', { class: 'chico meta-tarea' }, chipImportancia(t.importancia), ' ',
          hecha
            ? h('span', { class: 'suave', text: `Hecha por ${nombreDe(t.completada_por)} · ${fechaLinda(t.completada_en)}` })
            : t.asignada_a
              ? h('span', { class: 'asignada' }, avatarPerfil(perfilDe(t.asignada_a), 'micro'), nombreDe(t.asignada_a) + (t.asignada_a === yo.id ? ' (vos)' : ''))
              : h('span', { class: 'suave', text: 'Sin asignar' }),
          !hecha && t.vence ? h('span', { class: vencida ? 'debe' : 'suave', text: ' · ' + (vencida ? 'venció ' : 'para el ') + fechaLinda(t.vence) }) : null)),
      h('div', { class: 'acciones-li' },
        h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Editar ' + t.titulo, title: 'Editar', onclick: async () => { if (await formTarea(c, integrantes, t)) recargar(); } }, icono('editar')),
        puedeReabrir ? h('button', { class: 'btn sec mini', text: 'Reabrir', onclick: async () => {
          if (!await confirmar('¿Reabrir "' + t.titulo + '"?', `Vuelve a pendiente y ${nombreDe(t.completada_por)} pierde los ${t.importancia} pts de esa semana.`, 'Sí, reabrir')) return;
          await intentar(() => datos.reabrirTarea(t.id), 'Tarea reabierta.').catch(() => {}); recargar();
        } }) : null,
        puedeBorrar ? h('button', { class: 'btn peligro mini btn-icono', 'aria-label': 'Borrar ' + t.titulo, title: 'Borrar', onclick: async () => {
          if (!await confirmar('¿Borrar "' + t.titulo + '"?', hecha ? `Ya está hecha: ${nombreDe(t.completada_por)} pierde sus ${t.importancia} pts. No se puede deshacer.` : 'No se puede deshacer.')) return;
          await intentar(() => datos.borrarTarea(t.id), 'Tarea borrada.').catch(() => {}); recargar();
        } }, icono('borrar')) : null));
  }
  function pintar() {
    const orden = (a, b) => (b.importancia - a.importancia) || String(a.vence || '9999').localeCompare(String(b.vence || '9999'));
    const l = filtro === 'hechas' ? tareas.filter((t) => t.estado === 'hecha').sort((a, b) => String(b.completada_en).localeCompare(String(a.completada_en)))
      : filtro === 'mias' ? pend.filter((t) => t.asignada_a === yo.id).sort(orden) : [...pend].sort(orden);
    poner(lista, l.length ? l.map(fila) : h('li', { class: 'vacio-li' }, h('p', { class: 'suave', text:
      filtro === 'hechas' ? 'Todavía no hay tareas hechas.' : filtro === 'mias' ? 'No tenés tareas pendientes en este cliente.' : 'No hay tareas pendientes. Creá una con "+ Tarea".' })));
  }
  pintar();
  return h('section', { class: 'panel' },
    h('h2', {}, 'Tareas', h('button', { class: 'btn mini', onclick: async () => { if (await formTarea(c, integrantes)) recargar(); } }, icono('mas'), 'Tarea')),
    seg, lista);
}

function panelFeed(feed, integrantes) {
  const nombreDe = (id) => (id ? integrantes.find((m) => m.usuario_id === id)?.nombre || 'Ex integrante' : 'Alguien');
  const perfilDe = (id) => integrantes.find((m) => m.usuario_id === id) || { nombre: nombreDe(id) };
  const q = (t) => `«${t}»`;
  const texto = (f) => {
    const A = nombreDe(f.autor), O = nombreDe(f.otro);
    switch (f.tipo) {
      case 'tarea_creada': return `${A} creó ${q(f.texto)}` + (f.otro ? ` y se la asignó a ${O}` : '');
      case 'tarea_asignada': return `${A} le asignó ${q(f.texto)} a ${O}`;
      case 'tarea_hecha': return `${A} completó ${q(f.texto)}`;
      case 'tarea_reabierta': return `${A} reabrió ${q(f.texto)}`;
      case 'novedad': return `${A} anotó en el historial:`;
      case 'integrante_entro': return `${A} sumó a ${O}`;
      case 'integrante_salio': return f.autor === f.otro ? `${O} salió del cliente` : `${A} sacó a ${O}`;
      default: return f.texto || '';
    }
  };
  return h('section', { class: 'panel' }, h('h2', { text: 'Feed' }),
    feed.length ? h('ul', { class: 'feed' }, feed.map((f) => h('li', { class: 'feed-' + f.tipo },
      avatarPerfil(perfilDe(f.autor), 'mini'),
      h('div', { class: 'cuerpo' },
        h('p', {}, texto(f), f.tipo === 'tarea_hecha' && f.puntos ? [' ', h('span', { class: 'chip puntos', text: `+${f.puntos}` })] : null),
        f.tipo === 'novedad' && f.texto ? h('p', { class: 'cita texto-largo', text: f.texto }) : null,
        h('p', { class: 'chico suave', text: haceCuanto(f.creado_en) }))))) :
      h('p', { class: 'suave', text: 'Acá van a aparecer las tareas que se crean y se completan, las novedades y quién entra o sale.' }));
}

// Tareas pendientes asignadas a mí, en todos los clientes (arriba de la lista de clientes).
function panelMisTareas(mias) {
  if (!mias.length) return null;
  const hoy = hoyISO();
  return h('section', { class: 'panel mis-tareas' },
    h('h2', { text: `Tus tareas pendientes (${mias.length})` }),
    h('ul', { class: 'lista tareas' }, mias.map((t) => h('li', {},
      h('button', { class: 'check-tarea', type: 'button', 'aria-label': 'Marcar como hecha: ' + t.titulo, title: 'Marcar como hecha',
        onclick: async () => { await intentar(() => datos.completarTarea(t.id), `¡Hecha! +${t.importancia} ${t.importancia === 1 ? 'punto' : 'puntos'}`).catch(() => {}); ruta(); } }, icono('check')),
      h('div', { class: 'cuerpo' },
        h('p', {}, h('strong', { text: t.titulo })),
        h('p', { class: 'chico meta-tarea' }, chipImportancia(t.importancia), ' ',
          h('a', { href: '#/cliente/' + encodeURIComponent(t.cliente_id), text: t.clientes?.nombre || 'Cliente' }),
          t.vence ? h('span', { class: t.vence < hoy ? 'debe' : 'suave', text: ' · ' + (t.vence < hoy ? 'venció ' : 'para el ') + fechaLinda(t.vence) }) : null))))));
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
    const cl = (await datos.listarClientes()).filter((x) => esMio(x) || x.id === m.cliente_id);
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
  const puedeEditar = esAdmin() || m.dueno_id === yo.id;
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
    puedeEditar ? h('button', { class: 'btn peligro mini btn-icono', 'aria-label': 'Borrar ' + tituloMov(m), title: 'Borrar', onclick: async () => {
      if (!await confirmar('¿Borrar "' + tituloMov(m) + '"?', recurrente ? 'Se borra de todos los meses, también de los pasados. Si solo dejó de pagarse, usá "Dar de baja".' : `${plata(m.monto, m.moneda)} del ${fechaLinda(m.fecha)}. No se puede deshacer.`)) return;
      await intentar(() => datos.borrarMovimiento(m.id), 'Borrado'); ruta();
    } }, icono('borrar')) : null);
}

async function vistaFinanzas() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const hoyPref = mesDe(hoyISO());
  const pref = /^\d{4}-\d{2}$/.test(params.get('mes') || '') ? params.get('mes') : hoyPref;
  const [movsVisibles, acuerdosVisibles, clientes] = await Promise.all([datos.listarMovimientos(), datos.listarTodosAcuerdos(), datos.listarClientes()]);
  // Cada cuenta lleva sus Finanzas: solo los movimientos que cargó ella y los tratos de sus clientes.
  const movsTodos = movsVisibles.filter((m) => m.dueno_id === yo.id);
  const misIds = new Set(clientes.filter(esMio).map((c) => c.id));
  const acuerdos = acuerdosVisibles.filter((a) => misIds.has(a.cliente_id));
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
    h('p', { class: 'suave chico bloque nota-icono' }, icono('candado'), h('span', { text: 'Son las finanzas de tu cuenta: las ves vos y el administrador del panel. Un pago que carga otro integrante en un cliente compartido queda en sus finanzas, no en las tuyas.' + (monedasConDatos.length > 1 ? ' Pesos y dólares se cuentan por separado, sin convertir.' : '') })),
    carga,
    kpis,
    pMes,
    h('div', { class: 'graficos bloque' }, pFijos, graf2),
    h('div', { class: 'bloque' }, graf1),
    h('div', { class: 'bloque' }, tabla));
}

// ------------------------------------------------------------------
// Mapa de la web: tocar el globo, cargar el pin y editarlo
// ------------------------------------------------------------------
// La librería del mapa (MapLibre 5.24.0) está copiada en vendor/ y se carga solo
// en esta pantalla, con verificación de integridad. Los mapas son de OpenFreeMap.
const SERV_MAPA = [['webs', 'Webs'], ['ia', 'IA y bots'], ['redes', 'Redes'], ['marca', 'Marca']];
const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/positron';
let cargaMapLibre = null;
function cargarMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (cargaMapLibre) return cargaMapLibre;
  cargaMapLibre = new Promise((ok, no) => {
    const css = h('link', { rel: 'stylesheet', integrity: 'sha384-uTttxo/aOKbdE5RlD/SPzSDoDmNvGlUYPjONi2MN/b7c9HPSvW07OIuyP7uL6jxK' });
    css.href = 'vendor/maplibre-gl-5.24.0.css'; // archivo propio (el filtro de enlaces es para links de usuarios)
    const js = h('script', { src: 'vendor/maplibre-gl-5.24.0.js', integrity: 'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp' });
    js.addEventListener('load', () => ok(window.maplibregl));
    js.addEventListener('error', () => { cargaMapLibre = null; no(new Error('No se pudo cargar el mapa. Revisá internet y recargá.')); });
    document.head.append(css, js);
  });
  return cargaMapLibre;
}

async function lugarDePunto(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=es&lat=${lat}&lon=${lng}`, { referrerPolicy: 'no-referrer' });
    const d = await r.json();
    const a = d.address || {};
    return { ciudad: a.city || a.town || a.village || a.municipality || a.county || a.state || '', pais: a.country || '' };
  } catch { return { ciudad: '', pais: '' }; }
}

function pinElemento(c) {
  const el = h('button', { type: 'button', class: 'pin-mapa' + (c.mapa_estado === 'entregado' ? ' entregado' : ''), 'aria-label': 'Pin de ' + (c.mapa_nombre || c.nombre), title: c.mapa_nombre || c.nombre },
    h('img', { src: 'isotipo.svg', alt: '' }));
  return el;
}

// Cuadro para cargar o editar un pin
async function formPin({ cliente, lat, lng, clientes, sugerencia }) {
  const nuevo = !cliente;
  const sinPin = clientes.filter((c) => !c.mapa_publicar);
  const elegir = nuevo ? sel('cliente_id', [['__nuevo', '+ Cliente nuevo'], ...sinPin.map((c) => [c.id, c.nombre])], sinPin.length ? sinPin[0].id : '__nuevo') : null;
  const nombreNuevo = inp('nombre_nuevo', '', { placeholder: 'Nombre del negocio', maxlength: 200 });
  const campoNuevo = campo('Nombre del cliente nuevo *', nombreNuevo, 'entera');
  const c = cliente || {};
  const cuerpo = h('div', { class: 'grilla-form' },
    elegir ? campo('¿De qué cliente es?', elegir, 'entera') : null,
    elegir ? campoNuevo : null,
    campo('Nombre que se muestra en la web', inp('mapa_nombre', c.mapa_nombre, { placeholder: 'Si lo dejás vacío, va el nombre del negocio' }), 'entera'),
    campo('Ciudad *', inp('mapa_ciudad', c.mapa_ciudad || sugerencia?.ciudad || '', { required: true })),
    campo('País', inp('mapa_pais', c.mapa_pais || sugerencia?.pais || '')),
    h('div', { class: 'campo entera' }, h('span', { text: 'Servicios que se muestran' }),
      h('div', { class: 'chips' }, SERV_MAPA.map(([v, t]) => h('label', {}, h('input', { type: 'checkbox', name: 'mapa_servicios', value: v, checked: (c.mapa_servicios || []).includes(v) }), h('span', { text: t }))))),
    h('div', { class: 'campo entera' }, h('span', { text: 'Estado' }), segmento('mapa_estado', [['en marcha', 'En marcha'], ['entregado', 'Entregado']], c.mapa_estado || 'en marcha')),
    h('p', { class: 'chico suave entera', text: `Ubicación: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}. En la web solo se ve el nombre, la ciudad, el país, los servicios y el estado.` }));
  const syncNuevo = () => { campoNuevo.hidden = !elegir || elegir.value !== '__nuevo'; };
  if (elegir) { elegir.addEventListener('change', syncNuevo); syncNuevo(); }
  return dialogo({
    titulo: nuevo ? 'Nuevo pin' : 'Pin de ' + (c.nombre || ''),
    cuerpo,
    textoGuardar: nuevo ? 'Poner el pin' : 'Guardar',
    alGuardar: async (fd) => {
      const ciudad = String(fd.get('mapa_ciudad') || '').trim();
      if (!ciudad) throw new Error('Escribí la ciudad.');
      const datosPin = {
        mapa_publicar: true, mapa_lat: Number(lat), mapa_lng: Number(lng), mapa_ciudad: ciudad,
        mapa_pais: String(fd.get('mapa_pais') || '').trim() || null,
        mapa_nombre: String(fd.get('mapa_nombre') || '').trim() || null,
        mapa_servicios: fd.getAll('mapa_servicios'), mapa_estado: fd.get('mapa_estado') || 'en marcha',
      };
      if (nuevo && fd.get('cliente_id') === '__nuevo') {
        const nombre = String(fd.get('nombre_nuevo') || '').trim();
        if (!nombre) throw new Error('Escribí el nombre del cliente nuevo.');
        await datos.guardarCliente({ nombre, ciudad: [ciudad, datosPin.mapa_pais].filter(Boolean).join(', '), ...datosPin });
      } else {
        await datos.guardarCliente({ id: nuevo ? fd.get('cliente_id') : c.id, ...datosPin });
      }
      aviso(nuevo ? 'Pin agregado' : 'Pin guardado');
    },
  });
}

async function quitarPin(c) {
  if (!await confirmar('¿Sacar a ' + c.nombre + ' del mapa?', 'Deja de verse en la página Clientes de la web. La ficha no se borra.', 'Sacar del mapa')) return false;
  await intentar(() => datos.guardarCliente({ id: c.id, mapa_publicar: false }), 'Sacado del mapa');
  return true;
}

let mapaPanel = null;
async function vistaMapa() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const paraCliente = params.get('cliente');
  const clientes = (await datos.listarClientes()).filter((c) => esMio(c) || c.mapa_publicar);
  const conPin = clientes.filter((c) => c.mapa_publicar && c.mapa_lat != null);
  const objetivo = paraCliente ? clientes.find((c) => c.id === paraCliente) : null;

  const lienzo = h('div', { class: 'mapa-lienzo', role: 'application', 'aria-label': 'Globo para ubicar los pines' });
  const ayuda = h('div', { class: 'mapa-ayuda' }, icono('mas'), objetivo ? `Tocá el lugar exacto donde va ${objetivo.nombre}` : 'Tocá el lugar exacto donde querés poner un pin');
  const lista = h('ul', { class: 'lista' }, conPin.length ? conPin.map((c) => h('li', {},
    h('span', { class: 'icono-mov ingreso' }, icono('pin')),
    h('div', { class: 'cuerpo' }, h('p', {}, h('strong', { text: c.mapa_nombre || c.nombre })),
      h('p', { class: 'chico suave', text: [c.mapa_ciudad, c.mapa_pais].filter(Boolean).join(', ') + ' · ' + (c.mapa_estado === 'entregado' ? 'Entregado' : 'En marcha') })),
    h('button', { class: 'btn sec mini', onclick: () => volarA(c) }, 'Ver'),
    h('button', { class: 'btn sec mini btn-icono', 'aria-label': 'Editar pin de ' + c.nombre, onclick: async () => { if (await formPin({ cliente: c, lat: c.mapa_lat, lng: c.mapa_lng, clientes })) ruta(); } }, icono('editar')),
    h('button', { class: 'btn peligro mini btn-icono', 'aria-label': 'Sacar del mapa a ' + c.nombre, onclick: async () => { if (await quitarPin(c)) ruta(); } }, icono('borrar')))) :
    [h('li', { class: 'vacio-li' }, h('p', { class: 'suave', text: 'Todavía no hay pines. Tocá el globo donde trabajaste para un cliente.' }))]);

  poner($main,
    h('div', { class: 'encabezado' }, h('h1', { text: 'Mapa de la web' }),
      h('a', { class: 'btn sec', href: 'https://vectyo-landing-page.vercel.app/trabajos.html', target: '_blank', rel: 'noopener noreferrer' }, icono('web'), 'Ver en la web')),
    h('p', { class: 'suave bloque', text: 'Lo que ponés acá aparece al instante en el globo de la página Clientes. Podés arrastrar un pin para moverlo.' }),
    h('section', { class: 'mapa-caja vidrio' }, lienzo, ayuda),
    h('section', { class: 'panel bloque' }, h('h2', { text: `Pines en la web (${conPin.length})` }), lista));

  let ml;
  try { ml = await cargarMapLibre(); } catch (e) { poner(lienzo, h('p', { class: 'vacio', text: e.message })); return; }
  if (mapaPanel) { try { mapaPanel.remove(); } catch { /* ya no existe */ } }
  const mapa = new ml.Map({
    container: lienzo, style: ESTILO_MAPA,
    center: objetivo?.mapa_lng != null ? [objetivo.mapa_lng, objetivo.mapa_lat] : [-64, -30],
    zoom: objetivo?.mapa_lat != null ? 5 : 2.4, maxZoom: 12, attributionControl: false,
  });
  mapaPanel = mapa;
  mapa.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
  mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
  mapa.on('style.load', () => { try { mapa.setProjection({ type: 'globe' }); } catch { /* versión sin globo */ } });

  function volarA(c) { mapa.flyTo({ center: [c.mapa_lng, c.mapa_lat], zoom: 6, essential: true }); lienzo.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  for (const c of conPin) {
    const marcador = new ml.Marker({ element: pinElemento(c), draggable: true, anchor: 'bottom' }).setLngLat([c.mapa_lng, c.mapa_lat]).addTo(mapa);
    marcador.getElement().addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (await formPin({ cliente: c, lat: c.mapa_lat, lng: c.mapa_lng, clientes })) ruta();
    });
    marcador.on('dragend', async () => {
      const { lat, lng } = marcador.getLngLat();
      try { await datos.guardarCliente({ id: c.id, mapa_lat: Number(lat.toFixed(5)), mapa_lng: Number(lng.toFixed(5)) }); c.mapa_lat = lat; c.mapa_lng = lng; aviso('Pin movido'); }
      catch (e) { aviso(e.message, true); marcador.setLngLat([c.mapa_lng, c.mapa_lat]); }
    });
  }

  let temporal = null;
  mapa.on('click', async (ev) => {
    const { lat, lng } = ev.lngLat;
    if (temporal) temporal.remove();
    temporal = new ml.Marker({ element: h('span', { class: 'pin-mapa nuevo' }, h('img', { src: 'isotipo.svg', alt: '' })), anchor: 'bottom' }).setLngLat([lng, lat]).addTo(mapa);
    const sugerencia = await lugarDePunto(lat.toFixed(5), lng.toFixed(5));
    const ok = objetivo
      ? await formPin({ cliente: objetivo, lat: lat.toFixed(5), lng: lng.toFixed(5), clientes, sugerencia })
      : await formPin({ lat: lat.toFixed(5), lng: lng.toFixed(5), clientes, sugerencia });
    if (ok) { if (objetivo) location.hash = '#/mapa'; else ruta(); }
    else if (temporal) { temporal.remove(); temporal = null; }
  });
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
      s('path', { d: barra(cx - bw - 1, y(x.ingresos), bw, m.t + alto - y(x.ingresos)), class: 'b-ing' }),
      s('path', { d: barra(cx + 1, y(x.gastos), bw, m.t + alto - y(x.gastos)), class: 'b-gas' }),
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
    const [todosCl, ac] = await Promise.all([datos.listarClientes(), datos.listarTodosAcuerdos()]);
    const cl = todosCl.filter(esMio);
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
