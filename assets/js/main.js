/* Portfolio — interacción mínima: menú móvil y aparición de secciones.
   Sin dependencias. Si este fichero no carga, el menú sigue visible apilado
   y las secciones se muestran sin animación (todo está gobernado por la clase .js). */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  /* ── Menú hamburguesa ─────────────────────────────────── */
  var toggle = document.querySelector('.site-nav-toggle');
  var nav = document.querySelector('.site-nav');

  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    };

    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });

    /* Al pasar a escritorio, limpiamos el estado del menú */
    var desktop = window.matchMedia('(min-width: 721px)');
    var onViewportChange = function (event) {
      if (event.matches) setOpen(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onViewportChange);
    else if (desktop.addListener) desktop.addListener(onViewportChange);
  }

  /* ── Aparición suave de secciones al hacer scroll ─────── */
  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  targets.forEach(function (el) { observer.observe(el); });
})();
