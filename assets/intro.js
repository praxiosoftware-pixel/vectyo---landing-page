/* Vectyo · intro de la portada (ver intro.css) */
(function () {
  var raiz = document.documentElement;
  var intro = document.querySelector("[data-intro]");
  if (!intro) return;
  raiz.classList.add("intro-js");
  if (!raiz.classList.contains("intro-on")) { intro.remove(); return; }

  var svg = intro.querySelector(".intro__logo svg");
  var grupoTrazos = svg.querySelector(".intro__trazos");
  var slider = intro.querySelector(".intro__slider");
  var perilla = intro.querySelector(".intro__perilla");
  var saltar = intro.querySelector(".intro__saltar");
  var brillo = svg.querySelector("animateTransform");
  var NS = "http://www.w3.org/2000/svg";
  var listo = false;

  /* 1. Armar un trazo por cada subtrazo del logo para dibujarlos de a uno */
  var trazos = [];
  svg.querySelectorAll(".intro__relleno path").forEach(function (p) {
    var transformacion = p.getAttribute("transform");
    p.getAttribute("d").split(/(?=M)/).forEach(function (sub) {
      var t = document.createElementNS(NS, "path");
      t.setAttribute("d", sub.trim());
      t.setAttribute("class", "intro__trazo");
      if (transformacion) t.setAttribute("transform", transformacion);
      grupoTrazos.appendChild(t);
      trazos.push(t);
    });
  });

  var inicio = 350;
  trazos.forEach(function (t, i) {
    var largo = t.getTotalLength();
    var esIsotipo = !t.getAttribute("transform");
    var demora = esIsotipo ? inicio + i * 220 : inicio + 900 + (i - 3) * 95;
    var duracion = esIsotipo ? 1500 : 1000;
    t.style.strokeDasharray = largo + " " + largo;
    t.style.strokeDashoffset = largo;
    t.animate(
      [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }],
      { duration: duracion, delay: demora, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
    );
  });

  /* 2. Relleno, luz y slider */
  setTimeout(function () { intro.classList.add("is-luz"); }, 1300);
  setTimeout(function () {
    intro.classList.add("is-relleno");
    if (brillo && brillo.beginElement) setTimeout(function () { brillo.beginElement(); }, 500);
  }, 2600);
  setTimeout(function () {
    intro.classList.add("is-slider");
    setTimeout(function () { perilla.focus({ preventScroll: true }); }, 600);
  }, 3300);

  /* 3. Arrastre estilo iPhone */
  var x = 0, max = 0, origen = 0, arrastrando = false;

  function medir() {
    var pad = parseFloat(getComputedStyle(slider).getPropertyValue("--pad")) || 6;
    max = slider.clientWidth - perilla.offsetWidth - pad * 2;
  }
  function poner(v) {
    x = Math.max(0, Math.min(max, v));
    slider.style.setProperty("--x", x + "px");
  }

  perilla.addEventListener("pointerdown", function (e) {
    if (listo) return;
    medir();
    arrastrando = true;
    origen = e.clientX - x;
    slider.classList.remove("is-volviendo");
    slider.classList.add("is-arrastrando", "is-tocado");
    perilla.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  perilla.addEventListener("pointermove", function (e) {
    if (arrastrando) poner(e.clientX - origen);
  });
  function soltar() {
    if (!arrastrando) return;
    arrastrando = false;
    slider.classList.remove("is-arrastrando");
    if (x >= max * 0.82) { desbloquear(); }
    else {
      slider.classList.add("is-volviendo");
      poner(0);
      /* si no llegó, la guía vuelve a mostrarse al rato */
      setTimeout(function () { if (!arrastrando && !listo) slider.classList.remove("is-tocado"); }, 1500);
    }
  }
  perilla.addEventListener("pointerup", soltar);
  perilla.addEventListener("pointercancel", soltar);

  perilla.addEventListener("keydown", function (e) {
    if (["Enter", " ", "ArrowRight", "End"].indexOf(e.key) > -1) { e.preventDefault(); desbloquear(); }
  });
  saltar.addEventListener("click", function () { desbloquear(true); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") desbloquear(true);
  });

  /* 4. Desbloquear y mostrar la web */
  function desbloquear(directo) {
    if (listo) return;
    listo = true;
    try { sessionStorage.setItem("vectyo-intro", "1"); } catch (err) {}
    if (navigator.vibrate) navigator.vibrate(12);
    medir();
    slider.classList.add("is-volviendo", "is-tocado");
    poner(max);
    setTimeout(function () {
      intro.classList.add("is-saliendo");
      raiz.classList.add("intro-revelar");
      setTimeout(function () {
        intro.remove();
        raiz.classList.remove("intro-on", "intro-revelar");
      }, 2300);
    }, directo ? 0 : 380);
  }

  window.addEventListener("resize", function () { if (!arrastrando && !listo) { medir(); poner(0); } });
})();
