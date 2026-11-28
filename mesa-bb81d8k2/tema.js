// Aplica el estilo guardado antes de pintar la página (así no parpadea el claro).
// El estilo de cada cuenta vive en su perfil; esto es solo el recuerdo de este dispositivo.
(function () {
  try {
    var t = localStorage.getItem('vy-tema');
    if (t === 'asal' || t === 'ice' || t === 'focus') {
      document.documentElement.setAttribute('data-tema', t);
      document.documentElement.setAttribute('data-modo', 'oscuro');
    }
  } catch (e) { /* sin almacenamiento: queda Vectyo */ }
})();
