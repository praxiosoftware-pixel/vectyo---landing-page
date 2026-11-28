// Aplica el estilo y la posición del menú guardados antes de pintar la página (así no parpadea).
// Lo que manda es lo guardado en la cuenta; esto es solo el recuerdo de este dispositivo.
(function () {
  try {
    var r = document.documentElement;
    var t = localStorage.getItem('vy-tema');
    if (t === 'asal' || t === 'ice' || t === 'focus') {
      r.setAttribute('data-tema', t);
      r.setAttribute('data-modo', 'oscuro');
    }
    var m = localStorage.getItem('vy-menu');
    if (m === 'derecha' || m === 'arriba' || m === 'abajo') r.setAttribute('data-menu', m);
  } catch (e) { /* sin almacenamiento: queda lo de fábrica */ }
})();
