---
layout: default
---

{% assign contrato_count = 0 %}
{% for proyecto in site.projects %}
  {% if proyecto.contrato and proyecto.contrato != "" %}
    {% assign contrato_count = contrato_count | plus: 1 %}
  {% endif %}
{% endfor %}

<section class="hero">
  <div class="hero__head">
    <span class="hero__monogram" aria-hidden="true">JC</span>
    <div>
      <p class="hero__eyebrow">Junior Java Developer</p>
      <p class="hero__status"><span class="hero__status-dot" aria-hidden="true"></span>Disponible para oportunidades</p>
    </div>
  </div>
  <h1 class="hero__title">Backend robusto con Spring,<br><span class="accent">empezando por el contrato.</span></h1>
  <p class="hero__subtitle">Diseño interfaces y contratos antes que la implementación. Especializándome en Spring Boot: monolitos modulares, microservicios y procesos batch con Spring Batch.</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="#proyectos">Ver proyectos</a>
    <a class="btn btn--ghost" href="{{ '/contacto/' | relative_url }}">Contactar</a>
  </div>
  <ul class="hero__stats">
    <li><strong>{{ site.projects.size }}</strong>proyectos publicados</li>
    <li><strong>{{ contrato_count }}</strong>contratos OpenAPI</li>
    <li><strong>{{ site.errores.size }}</strong>post-mortems</li>
  </ul>
</section>

<section id="proyectos" class="section" data-reveal>
  <h2 class="section__title">Proyectos</h2>
  <p class="section__lead">Algunos de mis proyectos, con el contrato definido antes de escribir código. Sigo subiendo repositorios nuevos y actualizando los que ya están; aquí explico las decisiones de diseño de cada uno y en <a href="{{ site.author.github }}" target="_blank" rel="noopener">mi GitHub ↗</a> están todos.</p>
  <div class="projects-grid">
    {% assign proyectos = site.projects | sort: "orden" %}
    {% for proyecto in proyectos %}
      {% include project-card.html project=proyecto %}
    {% endfor %}
  </div>
</section>

<section id="stack" class="section" data-reveal>
  <h2 class="section__title">Stack</h2>
  <p class="section__lead">Tecnologías con las que construyo mis proyectos. En cada ficha detallo qué uso y por qué.</p>
  <div class="stack-groups">
    <div class="stack-group">
      <h3 class="stack-group__label">Backend</h3>
      <ul class="tech-tags">
        <li class="tech-tag">Java</li>
        <li class="tech-tag">Spring Boot</li>
        <li class="tech-tag">Spring Batch</li>
        <li class="tech-tag">Spring Security</li>
      </ul>
    </div>
    <div class="stack-group">
      <h3 class="stack-group__label">Datos</h3>
      <ul class="tech-tags">
        <li class="tech-tag">JPA</li>
        <li class="tech-tag">MySQL / PostgreSQL</li>
        <li class="tech-tag">H2 (tests)</li>
      </ul>
    </div>
    <div class="stack-group">
      <h3 class="stack-group__label">Contratos</h3>
      <ul class="tech-tags">
        <li class="tech-tag">OpenAPI</li>
        <li class="tech-tag">springdoc</li>
      </ul>
    </div>
    <div class="stack-group">
      <h3 class="stack-group__label">DevOps</h3>
      <ul class="tech-tags">
        <li class="tech-tag">Docker</li>
      </ul>
    </div>
    <div class="stack-group">
      <h3 class="stack-group__label">Herramientas</h3>
      <ul class="tech-tags">
        <li class="tech-tag">Maven</li>
        <li class="tech-tag">Git</li>
      </ul>
    </div>
    <div class="stack-group">
      <h3 class="stack-group__label">Testing</h3>
      <ul class="tech-tags">
        <li class="tech-tag">JUnit 5</li>
        <li class="tech-tag">Mockito</li>
        <li class="tech-tag">MockMvc</li>
        <li class="tech-tag">Postman</li>
      </ul>
    </div>
  </div>
</section>

<section id="contacto" class="section section--cta" data-reveal>
  <h2 class="section__title">Busco</h2>
  <p>Mi primera oportunidad profesional como Junior Java Developer, preferiblemente en remoto o, si es presencial, dentro de Extremadura. Busco un equipo donde aprender de desarrolladores con experiencia, crecer profesionalmente y aportar valor desde el primer sprint.</p>
  <div class="hero__actions">
    <a class="btn btn--primary" href="{{ '/contacto/' | relative_url }}">¿Hablamos? →</a>
    <a class="btn btn--ghost" href="{{ site.author.github }}" target="_blank" rel="noopener">Ver GitHub ↗</a>
  </div>
</section>
