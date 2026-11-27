/* Vectyo · mapa de Clientes (ver clientes.css)
   - MapLibre GL (gratis) con globo, relieve 3D y dos vistas: Satélite y Dibujo.
   - Datos: <script id="clientes-datos"> que arma armar.py desde _fuente/clientes.json.
     Los clientes con "ejemplo": true solo se muestran agregando ?demo a la dirección.
   - Satélite: con MAPBOX_TOKEN usa Mapbox (apto para la web publicada).
     Sin clave usa imágenes de Esri, pero solo en la compu (localhost) para probar. */
(function () {
  /* Clave pública de Mapbox (empieza con pk.). Vacía = satélite solo en la compu. */
  var MAPBOX_TOKEN = "";

  var raiz = document.querySelector(".mapa");
  var contenedor = document.getElementById("mapa");
  var nodoDatos = document.getElementById("clientes-datos");
  if (!raiz || !contenedor || !nodoDatos) return;

  var LIB = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/";
  var ESTILO_BASE = "https://tiles.openfreemap.org/styles/dark";
  var TERRENO = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
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
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var demo = /[?&]demo(=|&|$)/.test(location.search);
  var SIN_MARGEN = { top: 0, bottom: 0, left: 0, right: 0 };
  var MUNDO = { center: [-62, -16], zoom: movil ? 1.1 : 2, pitch: 0, bearing: 0, padding: SIN_MARGEN };
  /* con relieve, el pin no siempre termina donde se pidió: si quedó alto (bajo el título),
     se corre el mapa lo justo para que la ficha entre debajo */
  function bajarPin(c) {
    if (!c._el || activo !== c) return;
    var caja = contenedor.getBoundingClientRect(), r = c._el.getBoundingClientRect();
    var deseado = caja.top + caja.height * (movil ? 0.36 : 0.34);
    var falta = deseado - r.bottom;
    if (falta > 8) mapa.panBy([0, -falta], { duration: quieto ? 0 : 700 });
  }

  var datos = JSON.parse(nodoDatos.textContent);
  var clientes = (datos.clientes || []).filter(function (c) { return demo || !c.ejemplo; });
  /* una parada del recorrido por ciudad */
  var ciudades = [];
  clientes.forEach(function (c) {
    var clave = c.ciudad + "|" + c.pais;
    if (!ciudades.some(function (x) { return x.clave === clave; })) ciudades.push({ clave: clave, ciudad: c.ciudad, pais: c.pais, lat: c.lat, lng: c.lng });
  });

  var mapa = null, popup = null, activo = null, estilos = {};
  var satelite = !!MAPBOX_TOKEN || local;
  var vista = "dibujo";
  try { var guardada = localStorage.getItem("vectyo-mapa-vista"); if (guardada === "satelite" && satelite) vista = guardada; } catch (e) {}

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
    if (mapa.getZoom() < 4.5 || !ciudades.length) return ponerLugar("Clientes", "Vectyo en el mundo");
    var c = mapa.getCenter(), centro = { lat: c.lat, lng: c.lng }, mejor = null, dMejor = Infinity;
    ciudades.forEach(function (x) { var d = distanciaKm(centro, x); if (d < dMejor) { dMejor = d; mejor = x; } });
    if (mejor && dMejor < 250) ponerLugar("Operando en", mejor.ciudad + ", " + mejor.pais);
    else ponerLugar("Clientes", "Vectyo en el mundo");
  }

  /* ---------- estilos: Dibujo (marca) y Satélite ---------- */
  var CIELO = {
    "sky-color": "#0b0709", "horizon-color": "#1b2740", "fog-color": "#0b0709",
    "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.8, "fog-ground-blend": 0.7,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0]
  };
  var FUENTE_TERRENO = { type: "raster-dem", tiles: [TERRENO], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Relieve: Mapzen / AWS Terrain Tiles" };
  var NOMBRE_ES = ["coalesce", ["get", "name:es"], ["get", "name:latin"], ["get", "name"]];
  /* globo al ver el mundo y mapa plano al acercarse: con globo + relieve, MapLibre
     dibuja los pines corridos; en plano el relieve y los pines quedan bien */
  var PROYECCION = { type: ["interpolate", ["linear"], ["zoom"], 5, "vertical-perspective", 7, "mercator"] };

  function pintura(capa, props) { capa.paint = Object.assign({}, capa.paint || {}, props); }

  function armarEstilos(base) {
    /* --- Dibujo: el estilo oscuro de OpenFreeMap, recoloreado a la paleta --- */
    var d = JSON.parse(JSON.stringify(base));
    d.projection = PROYECCION;
    d.sky = CIELO;
    d.sources.terreno = FUENTE_TERRENO;
    d.terrain = { source: "terreno", exaggeration: 1.35 };
    d.layers.forEach(function (l) {
      var id = l.id;
      if (id === "background") pintura(l, { "background-color": "#160f13" });
      else if (id === "water") pintura(l, { "fill-color": "#0d1626" });
      else if (id === "waterway") pintura(l, { "line-color": "#0d1626" });
      else if (/^(landuse|landcover)/.test(id) && l.type === "fill") pintura(l, { "fill-color": "#1d1519" });
      else if (id === "building") pintura(l, { "fill-color": "#241a1f", "fill-outline-color": "#33262d" });
      else if (/^highway|^road|^railway|^aeroway/.test(id) && l.type === "line") pintura(l, { "line-color": /casing/.test(id) ? "#1a1216" : "#3a2c34" });
      else if (/^boundary_country/.test(id)) pintura(l, { "line-color": "rgba(204,221,241,0.32)" });
      else if (/^boundary_state/.test(id)) pintura(l, { "line-color": "rgba(204,221,241,0.12)" });
      if (id === "place_state") l.minzoom = 5;   /* provincias recién al acercarse */
      if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
        l.layout["text-field"] = NOMBRE_ES;
        pintura(l, { "text-color": /country|city/.test(id) ? "#d6d0d3" : "#a99fa4", "text-halo-color": "#160f13", "text-halo-width": 1.2 });
      }
    });
    /* relieve sombreado y edificios en volumen */
    var iRutas = d.layers.findIndex(function (l) { return l.id === "waterway"; });
    d.layers.splice(iRutas, 0, {
      id: "relieve", type: "hillshade", source: "terreno",
      paint: { "hillshade-shadow-color": "#070405", "hillshade-highlight-color": "rgba(204,221,241,0.14)", "hillshade-accent-color": "#2a1f25", "hillshade-exaggeration": 0.55 }
    });
    var iTextos = d.layers.findIndex(function (l) { return l.type === "symbol"; });
    d.layers.splice(iTextos, 0, {
      id: "edificios-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 14,
      paint: {
        "fill-extrusion-color": "#2f2329",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.9
      }
    });
    estilos.dibujo = d;

    /* --- Satélite: foto del planeta + fronteras y nombres de la base --- */
    var foto = MAPBOX_TOKEN
      ? { type: "raster", tiles: ["https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=" + MAPBOX_TOKEN], tileSize: 512, maxzoom: 19, attribution: "© Mapbox © Maxar" }
      : { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Imágenes © Esri, Maxar, Earthstar Geographics" };
    var s = {
      version: 8, projection: PROYECCION, sky: CIELO,
      glyphs: base.glyphs, sprite: base.sprite,
      sources: { foto: foto, terreno: FUENTE_TERRENO, openmaptiles: base.sources.openmaptiles },
      terrain: { source: "terreno", exaggeration: 1.35 },
      layers: [
        { id: "fondo", type: "background", paint: { "background-color": "#05070a" } },
        { id: "foto", type: "raster", source: "foto", paint: { "raster-saturation": -0.12, "raster-contrast": 0.08, "raster-brightness-max": 0.92 } }
      ]
    };
    base.layers.forEach(function (l) {
      if (!/^boundary_country|^place_(city|city_large|town|country)/.test(l.id)) return;
      var c = JSON.parse(JSON.stringify(l));
      if (c.type === "line") pintura(c, { "line-color": "rgba(255,255,255,0.45)" });
      if (c.type === "symbol") {
        c.layout["text-field"] = NOMBRE_ES;
        pintura(c, { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.75)", "text-halo-width": 1.4 });
      }
      s.layers.push(c);
    });
    estilos.satelite = s;
  }

  /* ---------- selector de vista ---------- */
  var botonesVista = raiz.querySelectorAll("[data-vista]");
  if (!satelite) raiz.querySelector('[data-vista="satelite"]').hidden = true;
  function marcarVista() {
    botonesVista.forEach(function (b) { b.setAttribute("aria-checked", b.dataset.vista === vista ? "true" : "false"); });
  }
  botonesVista.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.vista === vista || !mapa) return;
      vista = b.dataset.vista;
      try { localStorage.setItem("vectyo-mapa-vista", vista); } catch (e) {}
      marcarVista();
      mapa.setStyle(estilos[vista], { diff: false });
    });
  });
  marcarVista();

  /* ---------- pines y ficha ---------- */
  function crearPin(c) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "pin-mapa";
    el.setAttribute("aria-label", c.negocio + ", " + c.ciudad);
    el.innerHTML = '<span class="pin-mapa__halo"></span><span class="pin-mapa__gota"></span>' + CHEVRON;
    el.addEventListener("click", function (e) { e.stopPropagation(); abrir(c, true); });
    c._el = el;
    c._marcador = new window.maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([c.lng, c.lat]).addTo(mapa);
  }
  /* MapLibre dibuja igual los pines que quedan del otro lado del globo o lejísimos
     de la cámara: se ocultan los que no se podrían ver desde donde se está mirando */
  function ocultarLejanos() {
    if (!mapa) return;
    var c = mapa.getCenter(), centro = { lat: c.lat, lng: c.lng }, z = mapa.getZoom();
    var kmPorPixel = 40075 * Math.cos(c.lat * Math.PI / 180) / (512 * Math.pow(2, z));
    var radio = Math.max(kmPorPixel * Math.max(contenedor.clientWidth, contenedor.clientHeight) * 3.2, 300);
    var horizonte = 7000; /* ~63° de arco: más allá queda en el borde o detrás del globo */
    clientes.forEach(function (x) {
      if (!x._el) return;
      var d = distanciaKm(centro, x);
      x._el.style.visibility = d < Math.min(radio, horizonte) ? "visible" : "hidden";
    });
  }
  /* cuando el relieve termina de cargar después de un vuelo, MapLibre no reubica
     los pines ni la ficha: se los vuelve a ubicar cuando el mapa queda quieto */
  function reubicar() {
    clientes.forEach(function (c) { if (c._marcador) c._marcador.setLngLat([c.lng, c.lat]); });
    if (popup && activo) popup.setLngLat([activo.lng, activo.lat]);
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
      ponerLugar("Operando en", c.ciudad + ", " + c.pais);
      mapa.flyTo({ center: [c.lng, c.lat], zoom: 13.2, pitch: movil ? 50 : 60, bearing: -18, padding: SIN_MARGEN, duration: quieto ? 0 : 3200, essential: true });
      mapa.once("moveend", function () { mapa.once("idle", function () { reubicar(); bajarPin(c); }); });
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
  var recorridoOn = !quieto && ciudades.length > 0;
  var paso = -1, esperas = [], enRecorrido = false, turno = 0; /* turno: invalida pasos viejos al interrumpir */
  function limpiarEsperas() { esperas.forEach(clearTimeout); esperas = []; }
  function esperar(fn, ms) { esperas.push(setTimeout(fn, ms)); }
  function siguienteParada() {
    if (!recorridoOn || !mapa) return;
    var mio = ++turno;
    paso = (paso + 1) % (ciudades.length + 1);
    enRecorrido = true;
    if (paso === ciudades.length) {               /* vuelta al mundo entre vueltas */
      ponerLugar("Clientes", "Vectyo en el mundo");
      mapa.flyTo(Object.assign({ duration: 5000, essential: false }, MUNDO));
      mapa.once("moveend", function () { if (mio !== turno) return; enRecorrido = false; esperar(siguienteParada, 3500); });
      return;
    }
    var c = ciudades[paso];
    ponerLugar("Operando en", c.ciudad + ", " + c.pais);   /* el título anticipa el destino */
    mapa.flyTo({ center: [c.lng, c.lat], zoom: 11.6, pitch: 58, bearing: paso % 2 ? -24 : 22, padding: SIN_MARGEN, duration: 6500, curve: 1.6, essential: false });
    mapa.once("moveend", function () {
      if (mio !== turno) return;
      /* gira despacio sobre la ciudad y sigue */
      mapa.easeTo({ bearing: mapa.getBearing() + (paso % 2 ? 28 : -28), duration: 6000, easing: function (t) { return t; } });
      mapa.once("moveend", function () { if (mio !== turno) return; enRecorrido = false; esperar(siguienteParada, 400); });
    });
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
    if (btnRecorrido.getAttribute("aria-pressed") !== "true" || quieto || !ciudades.length) return;
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
  if (!ciudades.length || quieto) { recorridoOn = false; btnRecorrido.hidden = true; }
  actualizarBotonRecorrido();

  /* sin clientes: el globo gira solo, despacio */
  var girando = !quieto && !ciudades.length;
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
      if (z === 0) { if (activo) cerrar(); mapa.flyTo(Object.assign({ duration: quieto ? 0 : 2500 }, MUNDO)); }
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
  function crearMapa() {
    var ml = window.maplibregl;
    mapa = new ml.Map({
      container: contenedor,
      style: estilos[vista],
      center: MUNDO.center, zoom: MUNDO.zoom,
      maxPitch: 75,
      attributionControl: false,
      cooperativeGestures: tactil,   /* en el celular: dos dedos para mover, uno para bajar la página */
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Usá Ctrl + rueda para acercar el mapa",
        "CooperativeGesturesHandler.MacHelpText": "Usá ⌘ + rueda para acercar el mapa",
        "CooperativeGesturesHandler.MobileHelpText": "Usá dos dedos para mover el mapa"
      }
    });
    mapa.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");
    raiz._mapa = mapa; /* acceso para pruebas desde la consola */

    mapa.on("load", function () {
      clientes.forEach(crearPin);
      ocultarLejanos();
      raiz.classList.add("is-listo");
      actualizarLugar();
      if (recorridoOn) esperar(siguienteParada, 2200);
      else if (girando) girar();
    });
    mapa.on("move", ocultarLejanos);
    mapa.on("idle", reubicar);
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
    .then(function (r) { armarEstilos(r[1]); crearMapa(); })
    .catch(function () { raiz.classList.add("is-sin-mapa"); });
})();
