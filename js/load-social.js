/* Carga estilos y lógica social (badges, favoritos, reseñas, ubicación) */
(function () {
  function addCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function addJs(src) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.body.appendChild(s);
  }
  addCss('css/social.css');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { addJs('js/social-features.js'); });
  } else {
    addJs('js/social-features.js');
  }
})();
