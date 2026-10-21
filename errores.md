---
layout: page
title: Errores y post-mortems
subtitle: Lo que se rompió, por qué, y cómo lo arreglé
permalink: /errores/
---

Un portfolio donde todo sale a la primera huele a mentira. Aquí reúno los post-mortems de mis proyectos: los bugs de mis propias herramientas y los errores que cometí al adaptarlas, en el orden en que los encontré y con la verificación de cada fix.

{% assign errs = site.errores | sort: "proyecto" %}
{% if errs.size > 0 %}
<div class="projects-grid">
  {% for error in errs %}
  <article class="project-card">
    <div class="project-card__top">
      {% if error.proyecto %}<span class="badge">{{ error.proyecto }}</span>{% endif %}
    </div>
    <h3 class="project-card__title">
      <a href="{{ error.url | relative_url }}">{{ error.title }}</a>
    </h3>
    {% if error.resumen %}
      <p class="project-card__resumen">{{ error.resumen }}</p>
    {% endif %}
    <div class="project-card__links">
      <a class="project-card__more" href="{{ error.url | relative_url }}">Leer post-mortem →</a>
    </div>
  </article>
  {% endfor %}
</div>
{% else %}
<p>Aún no hay post-mortems publicados.</p>
{% endif %}
