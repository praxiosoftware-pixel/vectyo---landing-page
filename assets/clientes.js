/* Vectyo · mapa de Clientes (ver clientes.css)
   Mapa simple y liviano: globo del mundo en la paleta de la marca, solo con
   tierra, agua, fronteras y nombres. Muestra a qué distancia trabaja Vectyo,
   sin calles ni ubicaciones exactas (zoom máximo a nivel de región).
   - Datos: <script id="clientes-datos"> que arma armar.py desde _fuente/clientes.json.
     Los clientes con "ejemplo": true solo se muestran agregando ?demo a la dirección.
   - MapLibre GL 5.24.0 (gratis) + estilo oscuro de OpenFreeMap (gratis, uso comercial). */
(function () {
  var raiz = document.querySelector(".mapa");
  var contenedor = document.getElementById("mapa");
  var nodoDatos = document.getElementById("clientes-datos");
  if (!raiz || !contenedor || !nodoDatos) return;

  var LIB = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/";
  var ESTILO_BASE = "https://tiles.openfreemap.org/styles/dark";
  var SERVICIOS = {
    webs:  { nombre: "Webs",      color: "#3b82f6" },
    ia:    { nombre: "IA y bots", color: "#ccddf1" },
    redes: { nombre: "Redes",     color: "#c77d9a" },
    marca: { nombre: "Marca",     color: "#ffffff" }
  };
  var CHEVRON = '<svg viewBox="0 0 113 90" aria-hidden="true"><path fill-rule="evenodd" d="M0 0 L40 0 L77 45 L40 90 L0 90 L37 45 Z M51.5 45 L22.72 80 L33.72 80 L62.5 45 L33.72 10 L22.72 10 Z M52 0 L76 0 L113 45 L76 90 L52 90 L89 45 Z"/></svg>';
  var ICONO_LUGAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

  var movil = window.matchMedia("(max-width: 760px)").matches;
  var tactil = window.matchMedia("(pointer: coarse)").matches;
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var demo = /[?&]demo(=|&|$)/.test(location.search);

  var ZOOM_MAX = 6.5;                  /* nivel región: no se ven calles */
  var ZOOM_CIUDAD = movil ? 4.6 : 5.2; /* al volar a una ciudad */
  var MUNDO = { center: [-62, -16], zoom: movil ? 1.1 : 2 };

  var datos = JSON.parse(nodoDatos.textContent);
  var clientes = (datos.clientes || []).filter(function (c) { return demo || !c.ejemplo; });
  /* una parada del recorrido por ciudad */
  var ciudades = [];
  clientes.forEach(function (c) {
    var clave = c.ciudad + "|" + c.pais;
    if (!ciudades.some(function (x) { return x.clave === clave; })) ciudades.push({ clave: clave, ciudad: c.ciudad, pais: c.pais, lat: c.lat, lng: c.lng });
  });

  var mapa = null, popup = null, activo = null;

  /* ---------- utilidades ---------- */
  function esc(t) { var d = document.createElement("div"); d.textContent = t == null ? "" : t; return d.innerHTML; }
  function chips(c) {
    return '<div class="chips-servicio">' + c.servicios.map(function (s) {
      var sv = SERVICIOS[s] || { nombre: s, color: "#fff" };
      return '<span class="chip-servicio"><i style="--c:' + sv.color + '"></i>' + esc(sv.nombre) + "</span>";
    }).join("") + "</div>";
  }
  function distanciaKm(a, b) {
    var r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  /* puntos sobre el arco más corto entre dos lugares (la línea del trayecto) */
  function arco(a, b) {
    var r = Math.PI / 180, p1 = [a.lat * r, a.lng * r], p2 = [b.lat * r, b.lng * r];
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((p2[0] - p1[0]) / 2), 2) + Math.cos(p1[0]) * Math.cos(p2[0]) * Math.pow(Math.sin((p2[1] - p1[1]) / 2), 2)));
    if (d === 0) return [[a.lng, a.lat], [b.lng, b.lat]];
    var puntos = [];
    for (var i = 0; i <= 64; i++) {
      var f = i / 64, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(p1[0]) * Math.cos(p1[1]) + B * Math.cos(p2[0]) * Math.cos(p2[1]);
      var y = A * Math.cos(p1[0]) * Math.sin(p1[1]) + B * Math.cos(p2[0]) * Math.sin(p2[1]);
      var z = A * Math.sin(p1[0]) + B * Math.sin(p2[0]);
      puntos.push([Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
    }
    return puntos;
  }
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s);
    });
  }
  function cargarCss(href) {
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
  }
  function hayWebGL() {
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  }

  /* ---------- título: dónde estamos operando ---------- */
  var lugar = raiz.querySelector(".mapa__lugar");
  var lugarEtiqueta = raiz.querySelector("[data-lugar-etiqueta]");
  var lugarNombre = raiz.querySelector("[data-lugar-nombre]");
  function ponerLugar(etiqueta, nombre) {
    if (lugarNombre.textContent === nombre) return;
    lugarEtiqueta.textContent = etiqueta;
    lugarNombre.textContent = nombre;
    lugar.classList.remove("is-cambiando"); void lugar.offsetWidth; lugar.classList.add("is-cambiando");
  }
  function actualizarLugar() {
    if (!mapa) return;
    if (mapa.getZoom() < 3.8 || !ciudades.length) return ponerLugar("Clientes", "Vectyo en el mundo");
    var c = mapa.getCenter(), centro = { lat: c.lat, lng: c.lng }, mejor = null, dMejor = Infinity;
    ciudades.forEach(function (x) { var d = distanciaKm(centro, x); if (d < dMejor) { dMejor = d; mejor = x; } });
    if (mejor && dMejor < 400) ponerLugar("Operando en", mejor.ciudad + ", " + mejor.pais);
    else ponerLugar("Clientes", "Vectyo en el mundo");
  }

  /* ---------- estilo: solo tierra, agua, fronteras y nombres ---------- */
  var NOMBRE_ES = ["coalesce", ["get", "name:es"], ["get", "name:latin"], ["get", "name"]];
  function pintura(capa, props) { capa.paint = Object.assign({}, capa.paint || {}, props); }

  function armarEstilo(base) {
    var e = JSON.parse(JSON.stringify(base));
    e.projection = { type: "globe" };
    e.sky = {
      "sky-color": "#0b0709", "horizon-color": "#1b2740", "fog-color": "#0b0709",
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0]
    };
    e.layers = e.layers.filter(function (l) {
      return /^(background|water|boundary_country|place_country|place_city|place_city_large)/.test(l.id);
    });
    e.layers.forEach(function (l) {
      var id = l.id;
      if (id === "background") pintura(l, { "background-color": "#1d1519" });
      else if (id === "water") pintura(l, { "fill-color": "#0d1626" });
      else if (/^boundary_country/.test(id)) pintura(l, { "line-color": "rgba(204,221,241,0.3)", "line-blur": 0.4 });
      if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
        l.layout["text-field"] = NOMBRE_ES;
        pintura(l, { "text-color": "#c9c1c5", "text-halo-color": "#1d1519", "text-halo-width": 1.2 });
      }
    });
    /* línea del trayecto entre ciudades (se llena durante el recorrido) */
    e.sources.trayecto = { type: "geojson", data: { type: "FeatureCollection", features: [] } };
    e.layers.push({
      id: "trayecto", type: "line", source: "trayecto",
      layout: { "line-cap": "round" },
      paint: { "line-color": "#ccddf1", "line-width": 2, "line-opacity": 0.85, "line-dasharray": [1.5, 2] }
    });
    return e;
  }
  function trazar(desde, hasta) {
    if (!mapa || !mapa.getSource("trayecto")) return;
    var f = desde && hasta ? [{ type: "Feature", geometry: { type: "LineString", coordinates: arco(desde, hasta) } }] : [];
    mapa.getSource("trayecto").setData({ type: "FeatureCollection", features: f });
  }

  /* ---------- pines y ficha ---------- */
  function crearPin(c) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "pin-mapa";
    el.setAttribute("aria-label", c.negocio + ", " + c.ciudad);
    el.innerHTML = '<span class="pin-mapa__halo"></span><span class="pin-mapa__gota"></span>' + CHEVRON;
    el.addEventListener("click", function (e) { e.stopPropagation(); abrir(c, true); });
    c._el = el;
    new window.maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(mapa);
  }
  /* MapLibre dibuja igual los pines que quedan del otro lado del globo: se ocultan */
  function ocultarLejanos() {
    if (!mapa) return;
    var c = mapa.getCenter(), centro = { lat: c.lat, lng: c.lng };
    clientes.forEach(function (x) {
      if (x._el) x._el.style.visibility = distanciaKm(centro, x) < 7000 ? "visible" : "hidden";
    });
  }
  function marcarPines() { clientes.forEach(function (c) { if (c._el) c._el.classList.toggle("is-activo", c === activo); }); }

  function ficha(c) {
    var n = document.createElement("div");
    n.innerHTML = chips(c) +
      "<h2>" + esc(c.negocio) + "</h2>" +
      '<p class="ficha-mapa__lugar">' + ICONO_LUGAR + esc(c.ciudad + ", " + c.pais) + "</p>" +
      '<p class="ficha-mapa__estado' + (c.estado === "entregado" ? " is-entregado" : "") + '">' + (c.estado === "entregado" ? "Proyecto entregado" : "Servicio en marcha") + "</p>" +
      '<button type="button" class="ficha-mapa__cerrar" aria-label="Cerrar">×</button>';
    n.querySelector(".ficha-mapa__cerrar").addEventListener("click", cerrar);
    return n;
  }
  function abrir(c, volar) {
    activo = c;
    if (popup) popup.remove();
    popup = new window.maplibregl.Popup({ anchor: "top", offset: [0, 14], closeButton: false, closeOnClick: false, className: "ficha-mapa", maxWidth: "330px" })
      .setLngLat([c.lng, c.lat]).setDOMContent(ficha(c)).addTo(mapa);
    raiz.classList.add("is-ficha");
    marcarPines();
    if (volar) {
      detenerRecorrido(true);
      trazar(null, null);
      ponerLugar("Operando en", c.ciudad + ", " + c.pais);
      mapa.flyTo({ center: [c.lng, c.lat], zoom: Math.max(mapa.getZoom(), ZOOM_CIUDAD), duration: quieto ? 0 : 2200, essential: true });
    }
  }
  function cerrar() {
    activo = null;
    if (popup) { popup.remove(); popup = null; }
    raiz.classList.remove("is-ficha");
    marcarPines();
    programarReanudar();
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && activo) cerrar(); });

  /* ---------- recorrido automático de ciudad en ciudad ---------- */
  var btnRecorrido = raiz.querySelector("[data-recorrido]");
  var recorridoOn = !quieto && ciudades.length > 1;
  var paso = -1, esperas = [], enRecorrido = false, turno = 0; /* turno: invalida pasos viejos al interrumpir */
  function limpiarEsperas() { esperas.forEach(clearTimeout); esperas = []; }
  function esperar(fn, ms) { esperas.push(setTimeout(fn, ms)); }
  function siguienteParada() {
    if (!recorridoOn || !mapa) return;
    var mio = ++turno;
    var anterior = paso >= 0 && paso < ciudades.length ? ciudades[paso] : null;
    paso = (paso + 1) % (ciudades.length + 1);
    enRecorrido = true;
    if (paso === ciudades.length) {               /* vuelta al mundo entre vueltas */
      trazar(null, null);
      ponerLugar("Clientes", "Vectyo en el mundo");
      mapa.flyTo({ center: MUNDO.center, zoom: MUNDO.zoom, duration: 4500, essential: false });
      mapa.once("moveend", function () { if (mio !== turno) return; enRecorrido = false; esperar(siguienteParada, 4000); });
      return;
    }
    var c = ciudades[paso];
    trazar(anterior, c);                           /* la línea muestra cuánto se viaja */
    ponerLugar("Operando en", c.ciudad + ", " + c.pais);
    mapa.flyTo({ center: [c.lng, c.lat], zoom: ZOOM_CIUDAD, duration: 4800, curve: 1.8, essential: false });
    mapa.once("moveend", function () { if (mio !== turno) return; enRecorrido = false; esperar(siguienteParada, 3200); });
  }
  function detenerRecorrido(temporal) {
    limpiarEsperas();
    turno++;
    var estabaVolando = enRecorrido;
    enRecorrido = false;
    if (mapa && estabaVolando) mapa.stop();
    if (!temporal) { recorridoOn = false; actualizarBotonRecorrido(); }
    else programarReanudar();
  }
  var reanudar = null;
  function programarReanudar() {
    clearTimeout(reanudar);
    if (btnRecorrido.getAttribute("aria-pressed") !== "true" || quieto || ciudades.length < 2) return;
    reanudar = setTimeout(function () { if (!activo) { recorridoOn = true; siguienteParada(); } }, 20000);
  }
  function actualizarBotonRecorrido() {
    btnRecorrido.setAttribute("aria-pressed", recorridoOn ? "true" : "false");
    btnRecorrido.setAttribute("aria-label", recorridoOn ? "Pausar el recorrido automático" : "Reanudar el recorrido automático");
  }
  btnRecorrido.addEventListener("click", function () {
    if (btnRecorrido.getAttribute("aria-pressed") === "true") { clearTimeout(reanudar); detenerRecorrido(false); }
    else { recorridoOn = true; actualizarBotonRecorrido(); if (activo) cerrar(); siguienteParada(); }
  });
  if (ciudades.length < 2 || quieto) { recorridoOn = false; btnRecorrido.hidden = true; }
  actualizarBotonRecorrido();

  /* sin recorrido: el globo gira solo, despacio, mientras nadie lo toque */
  var girando = !quieto && ciudades.length < 2;
  function girar() {
    if (!girando || !mapa || mapa.getZoom() > 3) return;
    var c = mapa.getCenter();
    mapa.easeTo({ center: [c.lng - 12, c.lat], duration: 12000, easing: function (t) { return t; } });
  }

  /* ---------- controles ---------- */
  raiz.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!mapa) return;
      var z = Number(b.dataset.zoom);
      detenerRecorrido(true); girando = false;
      if (z === 0) { if (activo) cerrar(); trazar(null, null); mapa.flyTo({ center: MUNDO.center, zoom: MUNDO.zoom, duration: quieto ? 0 : 2000 }); }
      else if (z > 0) mapa.zoomIn(); else mapa.zoomOut();
    });
  });

  /* ---------- lista debajo del mapa ---------- */
  function lista() {
    var seccion = document.querySelector("[data-mapa-lista]");
    var ul = document.querySelector("[data-lista-clientes]");
    if (!seccion || !ul || !clientes.length) return;
    ul.innerHTML = clientes.map(function (c, i) {
      return '<li tabindex="0" data-i="' + i + '"><strong>' + esc(c.negocio) + "</strong><span>" + esc(c.ciudad + ", " + c.pais) + "</span>" + chips(c) + "</li>";
    }).join("");
    ul.querySelectorAll("li").forEach(function (li) {
      var ir = function () { raiz.scrollIntoView({ behavior: quieto ? "auto" : "smooth" }); if (mapa) abrir(clientes[Number(li.dataset.i)], true); };
      li.addEventListener("click", ir);
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); } });
    });
    seccion.hidden = false;
  }

  /* ---------- arranque ---------- */
  function crearMapa(estilo) {
    var ml = window.maplibregl;
    mapa = new ml.Map({
      container: contenedor,
      style: estilo,
      center: MUNDO.center, zoom: MUNDO.zoom,
      minZoom: 0.6, maxZoom: ZOOM_MAX,
      pitchWithRotate: false, dragRotate: false, touchPitch: false,   /* mapa plano, sin girar ni inclinar */
      attributionControl: false,
      cooperativeGestures: tactil,   /* en el celular: dos dedos para mover, uno para bajar la página */
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Usá Ctrl + rueda para acercar el mapa",
        "CooperativeGesturesHandler.MacHelpText": "Usá ⌘ + rueda para acercar el mapa",
        "CooperativeGesturesHandler.MobileHelpText": "Usá dos dedos para mover el mapa"
      }
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

    mapa.on("load", function () {
      clientes.forEach(crearPin);
      ocultarLejanos();
      raiz.classList.add("is-listo");
      actualizarLugar();
      if (recorridoOn) esperar(siguienteParada, 2200);
      else if (girando) girar();
    });
    mapa.on("move", ocultarLejanos);
    mapa.on("moveend", function () {
      actualizarLugar();
      if (girando) girar();
    });
    /* si la persona toca el mapa, el recorrido espera */
    ["mousedown", "touchstart", "wheel"].forEach(function (ev) {
      contenedor.addEventListener(ev, function () {
        girando = false;
        if (enRecorrido || esperas.length) detenerRecorrido(true);
        else programarReanudar();
      }, { passive: true });
    });
    mapa.on("click", function () { if (activo) cerrar(); });
  }

  if (!clientes.length) raiz.querySelector("[data-mapa-vacio]").hidden = false;
  lista();

  if (!hayWebGL()) { raiz.classList.add("is-sin-mapa"); return; }
  cargarCss(LIB + "maplibre-gl.css");
  Promise.all([cargarScript(LIB + "maplibre-gl.js"), fetch(ESTILO_BASE).then(function (r) { return r.json(); })])
    .then(function (r) { crearMapa(armarEstilo(r[1])); })
    .catch(function () { raiz.classList.add("is-sin-mapa"); });
})();
