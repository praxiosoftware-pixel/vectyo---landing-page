/* Vectyo · carrusel "Cómo trabajamos" (ver proceso.css) */
(function () {
  var raiz = document.querySelector(".proceso");
  if (!raiz) return;

  var visor = raiz.querySelector(".proceso__visor");
  var pista = raiz.querySelector(".proceso__pista");
  var pasos = Array.prototype.slice.call(raiz.querySelectorAll(".paso"));
  var tabs = Array.prototype.slice.call(raiz.querySelectorAll(".proceso__tab"));
  var listaTabs = raiz.querySelector(".proceso__pasos");
  var contador = raiz.querySelector(".proceso__contador b");
  var btnPausa = raiz.querySelector(".proceso__pausa");
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var actual = 0, pausaUsuario = false, pausaHover = false, visible = false;

  if (quieto) raiz.classList.add("is-quieto");

  /* animaciones de cada visual: quietas en su inicio hasta que el paso se activa */
  function animaciones(paso) {
    var v = paso.querySelector(".paso__visual");
    return v && v.getAnimations ? v.getAnimations({ subtree: true }) : [];
  }
  function reiniciar(paso, correr) {
    animaciones(paso).forEach(function (a) {
      a.currentTime = 0;
      if (correr) a.play(); else a.pause();
    });
  }

  function centrar() {
    var p = pasos[actual];
    var desplazamiento = (visor.clientWidth - p.offsetWidth) / 2 - p.offsetLeft;
    pista.style.transform = "translateX(" + desplazamiento + "px)";
    return desplazamiento;
  }

  function ir(n, desdeUsuario) {
    actual = (n + pasos.length) % pasos.length;
    pasos.forEach(function (p, i) {
      var activo = i === actual;
      p.classList.toggle("is-activo", activo);
      p.setAttribute("aria-hidden", activo ? "false" : "true");
      p.querySelectorAll("a, button").forEach(function (el) { el.tabIndex = activo ? 0 : -1; });
      if (!quieto) reiniciar(p, activo && visible);
    });
    tabs.forEach(function (t, i) {
      t.setAttribute("aria-selected", i === actual ? "true" : "false");
      t.tabIndex = i === actual ? 0 : -1;
      t.classList.toggle("is-visto", i < actual);
      /* reinicia la barra de progreso */
      var barra = t.querySelector(".proceso__barra i");
      barra.style.animation = "none"; barra.offsetWidth; barra.style.animation = "";
    });
    contador.textContent = String(actual + 1).padStart(2, "0");
    centrar();
    /* la pestaña activa a la vista, sin mover la página */
    var t = tabs[actual];
    if (listaTabs.scrollWidth > listaTabs.clientWidth) {
      listaTabs.scrollTo({ left: t.offsetLeft - listaTabs.clientWidth / 2 + t.offsetWidth / 2, behavior: quieto ? "auto" : "smooth" });
    }
    if (desdeUsuario) actualizarPausa();
  }

  /* reproducción automática: avanza cuando termina la barra del paso */
  tabs.forEach(function (t) {
    t.querySelector(".proceso__barra i").addEventListener("animationend", function () {
      if (t.getAttribute("aria-selected") === "true") ir(actual + 1);
    });
  });
  function actualizarPausa() {
    raiz.classList.toggle("is-pausado", pausaUsuario || pausaHover || !visible);
  }
  visor.addEventListener("mouseenter", function () { pausaHover = true; actualizarPausa(); });
  visor.addEventListener("mouseleave", function () { pausaHover = false; actualizarPausa(); });
  btnPausa.addEventListener("click", function () {
    pausaUsuario = !pausaUsuario;
    btnPausa.setAttribute("aria-pressed", pausaUsuario ? "true" : "false");
    btnPausa.setAttribute("aria-label", pausaUsuario ? "Reanudar el carrusel" : "Pausar el carrusel");
    actualizarPausa();
  });

  /* arranca cuando la sección entra en pantalla */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entradas) {
      var antes = visible;
      visible = entradas[0].isIntersecting;
      actualizarPausa();
      if (visible && !antes && !quieto) reiniciar(pasos[actual], true);
    }, { threshold: 0.35 }).observe(raiz);
  } else { visible = true; }
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden && visible;
    actualizarPausa();
  });

  /* navegación */
  tabs.forEach(function (t, i) { t.addEventListener("click", function () { ir(i, true); }); });
  listaTabs.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1, true); tabs[actual].focus(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1, true); tabs[actual].focus(); }
  });
  raiz.querySelectorAll("[data-mover]").forEach(function (b) {
    b.addEventListener("click", function () { ir(actual + Number(b.dataset.mover), true); });
  });
  pasos.forEach(function (p, i) {
    p.addEventListener("click", function () { if (i !== actual && !movido) ir(i, true); });
  });

  /* arrastre con mouse o dedo */
  var inicioX = 0, inicioY = 0, base = 0, arrastrando = false, movido = false, puntero = null;
  visor.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 || e.target.closest("a, button")) return;
    arrastrando = true; movido = false; puntero = e.pointerId;
    inicioX = e.clientX; inicioY = e.clientY;
    base = centrar();
  });
  visor.addEventListener("pointermove", function (e) {
    if (!arrastrando || e.pointerId !== puntero) return;
    var dx = e.clientX - inicioX, dy = e.clientY - inicioY;
    if (!movido) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { arrastrando = false; return; } /* era scroll vertical */
      movido = true;
      visor.classList.add("is-arrastrando");
      visor.setPointerCapture(e.pointerId);
    }
    /* resistencia en los extremos */
    if ((actual === 0 && dx > 0) || (actual === pasos.length - 1 && dx < 0)) dx *= 0.35;
    pista.style.transform = "translateX(" + (base + dx) + "px)";
  });
  function soltar(e) {
    if (!arrastrando) return;
    arrastrando = false;
    visor.classList.remove("is-arrastrando");
    if (!movido) return;
    var dx = e.clientX - inicioX, umbral = Math.min(120, visor.clientWidth * 0.15);
    if (dx < -umbral && actual < pasos.length - 1) ir(actual + 1, true);
    else if (dx > umbral && actual > 0) ir(actual - 1, true);
    else centrar();
    setTimeout(function () { movido = false; }, 0);
  }
  visor.addEventListener("pointerup", soltar);
  visor.addEventListener("pointercancel", soltar);
  visor.addEventListener("dragstart", function (e) { e.preventDefault(); });

  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    pista.style.transition = "none";
    centrar();
    t = setTimeout(function () { pista.style.transition = ""; }, 60);
  });

  ir(0);
})();
