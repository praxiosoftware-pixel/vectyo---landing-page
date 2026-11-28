/* Vectyo · intro de Futuro (ver futuro.css)
   1. Se tipea código al azar.
   2. Cada palabra del código se transforma en un ladrillo.
   3. Los ladrillos vuelan y arman una casa (muro ciruela, techo azul).
   4. Se abre la puerta (es un hueco: detrás está la web real).
   5. La cámara entra por la puerta: zoom, desenfoque y fundido a la web.
   Todo depende del reloj, así que un cambio de tamaño solo recalcula posiciones. */
(function () {
  var raiz = document.documentElement;
  var capa = document.querySelector("[data-futuro]");
  if (!capa) return;
  raiz.classList.add("futuro-js");
  if (!raiz.classList.contains("futuro-on")) { capa.remove(); return; }

  var lienzo = capa.querySelector("canvas");
  var ctx = lienzo.getContext("2d");
  var fondo = document.createElement("canvas");
  var fctx = fondo.getContext("2d");
  var FUENTE = '"JetBrains Mono", ui-monospace, Consolas, monospace';

  var C = { blanco: "#ffffff", suave: "#d6d0d3", meta: "#a99fa4", azul20: "#ccddf1" };
  var MURO = ["#542f3c", "#4b2a36", "#5f3545", "#683b4c", "#45262f"];
  var TECHO = ["#0057b8", "#004ea6", "#0a63c6", "#00479a"];

  /* Línea de tiempo (ms) */
  var T_TIPEO = 150, D_TIPEO = 1900;   // tipeo
  var T_MORF = 2250, D_MORF = 520;     // palabra → ladrillo
  var T_VUELO = 2650, ABANICO = 1350, D_VUELO = 680; // ladrillos a la casa
  var T_PUERTA = 4750, D_PUERTA = 480; // se abre la puerta
  var T_ZOOM = 5300, D_SALIDA = 1600;  // entrar por la puerta

  function azar(a) { return a[Math.floor(Math.random() * a.length)]; }
  function lim(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function suave(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function salida(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- 1. La casa, en unidades (un ladrillo = 2 × 1) ---------- */
  var ANCHO = 20, FILAS_MURO = 7, FILAS_TECHO = 6, ALTO_FILA = .92;
  var PUERTA = { x: 8, y: 0, w: 4, h: 4 };
  var VENTANAS = [{ x: 2, y: 3, w: 3, h: 3 }, { x: 15, y: 3, w: 3, h: 3 }];
  var huecos = [PUERTA].concat(VENTANAS);
  var ladrillos = [];

  function cortar(fila, a, b, tipo) {
    var cortes = [a];
    for (var x = a + 1; x < b; x++) if (((x - fila % 2) % 2 + 2) % 2 === 0) cortes.push(x);
    cortes.push(b);
    for (var i = 0; i < cortes.length - 1; i++) {
      ladrillos.push({
        x: cortes[i], w: cortes[i + 1] - cortes[i], fila: fila, tipo: tipo,
        color: azar(tipo === "techo" ? TECHO : MURO)
      });
    }
  }
  for (var f = 0; f < FILAS_MURO; f++) {
    var tramos = [[0, ANCHO]];
    huecos.forEach(function (h) {
      if (f < h.y || f >= h.y + h.h) return;
      var nuevos = [];
      tramos.forEach(function (t) {
        if (h.x + h.w <= t[0] || h.x >= t[1]) { nuevos.push(t); return; }
        if (h.x > t[0]) nuevos.push([t[0], h.x]);
        if (h.x + h.w < t[1]) nuevos.push([h.x + h.w, t[1]]);
      });
      tramos = nuevos;
    });
    tramos.forEach(function (t) { cortar(f, t[0], t[1], "muro"); });
  }
  for (var k = 0; k < FILAS_TECHO; k++) cortar(FILAS_MURO + k, -1 + 2 * k, ANCHO + 1 - 2 * k, "techo");

  /* se construye de abajo hacia arriba, con un poco de desorden */
  ladrillos.forEach(function (b) { b.clave = b.fila + Math.random() * .9; });
  ladrillos.sort(function (a, b) { return a.clave - b.clave; });
  ladrillos.forEach(function (b, i) { b.orden = i / (ladrillos.length - 1); });
  var N = ladrillos.length;

  /* ---------- 2. El código al azar ---------- */
  var V = {
    id: ["clientes", "pedidos", "turnos", "ventas", "agenda", "consultas", "reservas", "stock"],
    obj: ["web", "bot", "crm", "tienda", "panel", "sheets", "whatsapp", "agenda"],
    fn: ["responder", "agendar", "cotizar", "publicar", "medir", "automatizar", "conectar", "enviar", "sincronizar", "crecer"],
    Id: ["Web", "Bot", "Panel", "Tienda", "Agenda", "Marca"],
    str: ['"hola!"', '"nuevo turno"', '"pedido listo"', '"gracias"', '"en 24 h"'],
    ev: ['"mensaje"', '"pedido"', '"turno"', '"consulta"'],
    com: ["cada línea es un ladrillo", "herramientas para tu negocio", "menos horas a mano", "automatizar lo repetitivo", "construir, medir, mejorar"],
    num: ["24", "48", "100", "7", "3"]
  };
  var PLANTILLAS = [
    'import { {Id} } from "@vectyo/{obj}";',
    "const {id} = await {obj}.{fn}();",
    "function {fn}({id}) {",
    "  if ({id}.length > {num}) {obj}.{fn}();",
    "  return {obj}.{fn}({str});",
    "}",
    "// {com}",
    "{obj}.on({ev}, {fn});",
    "let {id} = new {Id}({num});",
    "  await {obj}.{fn}({id});",
    "export default {Id};"
  ];
  var CLAVES = /^(const|let|function|return|if|await|import|from|export|default|new)$/;

  var lineas = [], fichas = [], totalLetras = 0;
  function sumarLinea(texto) {
    var i = lineas.length, comentario = texto.trim().indexOf("//") === 0;
    lineas.push({ texto: texto, inicio: totalLetras });
    var m, re = /\S+/g;
    while ((m = re.exec(texto))) {
      var t = m[0];
      fichas.push({
        texto: t, linea: i, col: m.index, inicio: totalLetras + m.index,
        color: comentario ? C.meta : CLAVES.test(t.replace(/[^\w]/g, "")) ? C.azul20 :
               t.indexOf('"') > -1 ? C.suave : /^[{}();]+$/.test(t) ? C.meta : C.blanco
      });
    }
    totalLetras += texto.length + 4; // la pausa del salto de línea
  }
  sumarLinea("// " + azar(V.com));
  while (fichas.length < N) {
    sumarLinea(azar(PLANTILLAS).replace(/\{(\w+)\}/g, function (_, k) { return azar(V[k]); }));
  }
  var largoMax = lineas.reduce(function (m, l) { return Math.max(m, l.texto.length); }, 0);

  /* cada palabra recibe un ladrillo: las de abajo tienden a ir abajo; las que sobran se disuelven */
  var porLinea = fichas.slice().sort(function (a, b) {
    return (b.linea + Math.random() * 7) - (a.linea + Math.random() * 7);
  });
  porLinea.forEach(function (fi, i) {
    fi.ladrillo = i < N ? ladrillos[i] : null;
    fi.giro = (Math.random() - .5) * 1.6;
    fi.arco = .08 + Math.random() * .14;
    fi.demora = Math.random() * 180;
  });

  /* ---------- 3. Medidas según la pantalla ---------- */
  var W, H, dpr, fs, cw, lh, x0, y0, u, izq, base, gap;

  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth || raiz.clientWidth); H = Math.max(1, window.innerHeight || raiz.clientHeight);
    lienzo.width = fondo.width = Math.round(W * dpr);
    lienzo.height = fondo.height = Math.round(H * dpr);

    var cols = largoMax + 4;
    fs = Math.min(16, W * .88 / (cols * .6), H * .8 / (lineas.length * 1.55));
    ctx.font = fs + "px " + FUENTE;
    cw = ctx.measureText("M").width;
    lh = fs * 1.55;
    x0 = (W - cols * cw) / 2;
    y0 = (H - lineas.length * lh) / 2;

    u = Math.min(W * .8 / (ANCHO + 2), H * .6 / ((FILAS_MURO + FILAS_TECHO) * ALTO_FILA), 40);
    izq = W / 2 - ANCHO * u / 2;
    base = H / 2 + (FILAS_MURO + FILAS_TECHO) * ALTO_FILA * u / 2;
    gap = Math.max(1.5, u * .13);

    pintarFondo();
  }

  function pintarFondo() {
    var g = fctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#1d1519";
    g.fillRect(0, 0, W, H);
    /* luz con dirección: dos haces diagonales a 50,6° */
    var d = Math.hypot(W, H);
    [["84 47 60", .55, -.22, .34], ["0 87 184", .22, .2, .22]].forEach(function (h) {
      g.save();
      g.translate(W / 2 + h[2] * W, H / 2);
      g.rotate(-50.6 * Math.PI / 180);
      var ancho = d * h[3];
      var gr = g.createLinearGradient(0, -ancho / 2, 0, ancho / 2);
      gr.addColorStop(0, "rgb(" + h[0].replace(/ /g, ",") + ",0)");
      gr.addColorStop(.5, "rgba(" + h[0].replace(/ /g, ",") + "," + h[1] + ")");
      gr.addColorStop(1, "rgb(" + h[0].replace(/ /g, ",") + ",0)");
      g.fillStyle = gr;
      g.fillRect(-d, -ancho / 2, d * 2, ancho);
      g.restore();
    });
  }

  function rectHueco(h) {
    return { x: izq + h.x * u, y: base - (h.y + h.h) * ALTO_FILA * u, w: h.w * u, h: h.h * ALTO_FILA * u };
  }
  function rectLadrillo(b) {
    return {
      cx: izq + (b.x + b.w / 2) * u,
      cy: base - (b.fila + .5) * ALTO_FILA * u,
      w: b.w * u - gap, h: ALTO_FILA * u - gap
    };
  }
  function redondeado(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  /* ---------- 4. Dibujo de cada cuadro ---------- */
  function cuadro(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(fondo, 0, 0, W, H);

    var tecleado = Math.pow(lim((t - T_TIPEO) / D_TIPEO), 1.5) * totalLetras;
    var morfGlobal = lim((t - T_MORF) / D_MORF);
    var puerta = suave(lim((t - T_PUERTA) / D_PUERTA));
    var luzVentanas = lim((t - T_PUERTA + 350) / 600);

    /* la puerta es un hueco: detrás espera la web real */
    var P = rectHueco(PUERTA);
    if (puerta > 0) ctx.clearRect(P.x + P.w * (1 - puerta) / 2, P.y, P.w * puerta, P.h);

    /* piso */
    var piso = salida(lim((t - T_VUELO) / 700));
    if (piso > 0) {
      var mitad = (ANCHO / 2 + 3) * u * piso;
      ctx.fillStyle = "rgba(169,159,164,.28)";
      ctx.fillRect(W / 2 - mitad, base + gap / 2, mitad * 2, 1);
    }

    /* números de línea */
    ctx.font = fs + "px " + FUENTE;
    ctx.textBaseline = "middle";
    if (morfGlobal < 1) {
      ctx.globalAlpha = .38 * (1 - morfGlobal);
      ctx.fillStyle = C.meta;
      ctx.textAlign = "right";
      lineas.forEach(function (l, i) {
        if (tecleado >= l.inicio) ctx.fillText(String(i + 1), x0 + 2.4 * cw, y0 + (i + .5) * lh);
      });
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    var bw0 = 2 * u - gap, bh0 = ALTO_FILA * u - gap;
    fichas.forEach(function (fi) {
      var letras = Math.min(fi.texto.length, Math.floor(tecleado - fi.inicio));
      if (letras <= 0 && t < T_MORF) return;
      if (letras <= 0) letras = fi.texto.length;

      var w0 = fi.texto.length * cw + cw * .3, h0 = fs * 1.3;
      var cx0 = x0 + (4 + fi.col) * cw - cw * .15 + w0 / 2;
      var cy0 = y0 + (fi.linea + .5) * lh;
      var m = suave(lim((t - T_MORF - fi.demora) / D_MORF));
      var b = fi.ladrillo;
      var destino = b ? rectLadrillo(b) : null;
      var bw = destino ? destino.w : bw0, bh = destino ? destino.h : bh0;

      var cx = cx0, cy = cy0, w = lerp(w0, bw, m), h = lerp(h0, bh, m), giro = 0, alfa = 1;
      var v = b ? lim((t - T_VUELO - b.orden * ABANICO) / D_VUELO) : 0;
      if (b && v > 0) {
        var e = suave(v);
        cx = lerp(cx0, destino.cx, e);
        cy = lerp(cy0, destino.cy, e) - Math.sin(Math.PI * v) * H * fi.arco;
        giro = fi.giro * Math.sin(Math.PI * v);
      }
      if (!b) { alfa = 1 - m; cy += m * 24; } // las que sobran se disuelven

      ctx.save();
      ctx.translate(cx, cy);
      if (giro) ctx.rotate(giro);
      ctx.globalAlpha = alfa;
      if (m > 0) {
        ctx.globalAlpha = alfa * m;
        ctx.fillStyle = b ? b.color : MURO[0];
        redondeado(-w / 2, -h / 2, w, h, Math.min(h * .16, 5));
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.09)";
        ctx.fillRect(-w / 2 + h * .2, -h / 2 + 1, w - h * .4, Math.max(1, h * .08));
        /* destello al encastrar */
        var golpe = b ? (t - T_VUELO - b.orden * ABANICO - D_VUELO) / 320 : -1;
        if (golpe > 0 && golpe < 1) {
          ctx.fillStyle = "rgba(204,221,241," + (.4 * (1 - golpe)) + ")";
          ctx.fill();
        }
      }
      if (m < 1) {
        ctx.globalAlpha = alfa * (1 - m);
        ctx.fillStyle = fi.color;
        ctx.fillText(fi.texto.slice(0, letras), -w0 / 2 + cw * .15, 0);
      }
      ctx.restore();
    });

    /* cursor */
    if (t < T_MORF) {
      var li = 0;
      for (var i = 0; i < lineas.length; i++) if (lineas[i].inicio <= tecleado) li = i;
      var col = Math.min(lineas[li].texto.length, Math.floor(tecleado - lineas[li].inicio));
      var tipeando = tecleado < totalLetras - 4;
      if (tipeando || t % 520 < 290) {
        ctx.fillStyle = C.azul20;
        ctx.fillRect(x0 + (4 + col) * cw, y0 + (li + .5) * lh - fs * .6, Math.max(2, cw * .5), fs * 1.2);
      }
    }

    /* ventanas encendidas y marco de luz de la puerta */
    if (luzVentanas > 0) {
      VENTANAS.forEach(function (vn) {
        var r = rectHueco(vn);
        ctx.fillStyle = "rgba(204,221,241," + (.2 * luzVentanas) + ")";
        ctx.fillRect(r.x + gap / 2, r.y + gap / 2, r.w - gap, r.h - gap);
        ctx.fillStyle = "rgba(29,21,25," + (.85 * luzVentanas) + ")";
        ctx.fillRect(r.x + r.w / 2 - gap / 2, r.y + gap / 2, gap, r.h - gap);
        ctx.fillRect(r.x + gap / 2, r.y + r.h / 2 - gap / 2, r.w - gap, gap);
      });
    }
    if (puerta > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(204,221,241,.9)";
      ctx.shadowBlur = 24 * puerta;
      ctx.strokeStyle = "rgba(204,221,241," + (.85 * puerta) + ")";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(P.x + gap / 2, P.y + gap / 2, P.w - gap, P.h - gap / 2);
      ctx.restore();
    }
  }

  /* ---------- 5. Reloj, salto y salida ---------- */
  var t0 = 0, adelanto = 0, saliendo = false, terminado = false;

  function bucle(ahora) {
    if (terminado) return;
    if (!t0) t0 = ahora;
    var t = ahora - t0 + adelanto;
    cuadro(t);
    if (!saliendo && t >= T_ZOOM) salir();
    requestAnimationFrame(bucle);
  }

  function salir() {
    saliendo = true;
    var P = rectHueco(PUERTA);
    capa.style.setProperty("--ox", (P.x + P.w / 2) + "px");
    capa.style.setProperty("--oy", (P.y + P.h * .55) + "px");
    capa.style.setProperty("--zoom", Math.max(W / P.w, H / P.h) * 1.6);
    void capa.offsetWidth;
    capa.classList.add("is-zoom");
    raiz.classList.add("futuro-revelar");
    setTimeout(function () {
      terminado = true;
      capa.remove();
      raiz.classList.remove("futuro-on", "futuro-revelar");
    }, D_SALIDA + 900);
  }

  /* tocar, hacer clic o apretar una tecla adelanta hasta la casa terminada */
  function saltar() {
    if (saliendo || !t0) return;
    var t = performance.now() - t0 + adelanto;
    if (t < T_PUERTA + D_PUERTA) adelanto += T_PUERTA + D_PUERTA - t;
  }
  capa.addEventListener("pointerdown", saltar);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") saltar(); });
  window.addEventListener("resize", function () { if (!saliendo) medir(); });

  try { sessionStorage.setItem("vectyo-futuro", "1"); } catch (err) {}

  /* arranca cuando está la tipografía mono (o a los 700 ms, lo que pase primero) */
  var arrancar = function () {
    if (t0 || arrancar.hecho) return;
    arrancar.hecho = true;
    medir();
    cuadro(0);
    capa.classList.add("is-lienzo");
    requestAnimationFrame(bucle);
  };
  if (document.fonts && document.fonts.load) {
    document.fonts.load("16px \"JetBrains Mono\"").then(arrancar, arrancar);
    setTimeout(arrancar, 700);
  } else arrancar();
})();
