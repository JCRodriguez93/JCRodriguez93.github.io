---
layout: page
title: Contacto
subtitle: Escríbeme y te respondo en menos de 24 horas
permalink: /contacto/
---

¿Hablamos? Estoy buscando mi primera oportunidad como desarrollador backend para seguir aprendiendo, aportar al equipo y crecer trabajando en proyectos reales. ¡Me encantará saber de ti!

<form class="contact-form" id="contact-form" action="https://formspree.io/f/moejgnoo" method="POST" accept-charset="UTF-8">
  <label class="contact-form__label" for="cf-email">Tu email</label>
  <input class="contact-form__input" type="email" id="cf-email" name="email" required placeholder="tu@email.com" autocomplete="email">

  <label class="contact-form__label" for="cf-message">Tu mensaje</label>
  <textarea class="contact-form__textarea" id="cf-message" name="message" rows="6" required placeholder="Cuéntame en qué puedo ayudarte..."></textarea>

  <input type="hidden" name="_subject" value="Nuevo mensaje desde el portfolio">
  <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;">

  <!-- Cloudflare Turnstile (anti-bots), pendiente de activar. Cuando toque:
       1. Descomentar el script de abajo y el div del widget.
       2. Pegar la Site key en data-sitekey (https://dash.cloudflare.com/?to=/:account/turnstile)
       3. Activar CAPTCHA → Cloudflare Turnstile en el panel de Formspree con la Secret key -->
 <!--<div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITEKEY"></div>-->

  <button class="btn btn--primary contact-form__submit" type="submit">Enviar mensaje</button>
  <p class="contact-form__error" id="cf-error" role="alert" hidden></p>
</form>
<!--<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>-->
<script>
(function () {
  var form = document.getElementById("contact-form");
  var modal = document.getElementById("thanks-modal");
  var errorEl = document.getElementById("cf-error");
  if (!form || !modal) return;

  var btn = form.querySelector('button[type="submit"]');

  function closeModal() {
    modal.hidden = true;
    btn.focus();
  }

  modal.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.hidden = true;
    btn.disabled = true;
    btn.textContent = "Enviando…";

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { "Accept": "application/json" }
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          modal.hidden = false;
          modal.querySelector(".btn").focus();
          try { if (window.turnstile) turnstile.reset(); } catch (err) {}
        } else {
          errorEl.textContent = "No se ha podido enviar el mensaje. Prueba a escribirme directamente a jorgecampos_open2work@protonmail.com.";
          errorEl.hidden = false;
        }
      })
      .catch(function () {
        errorEl.textContent = "No se ha podido enviar el mensaje. Prueba a escribirme directamente a jorgecampos_open2work@protonmail.com.";
        errorEl.hidden = false;
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Enviar mensaje";
      });
  });
})();
</script>

<div class="thanks-modal" id="thanks-modal" hidden role="dialog" aria-modal="true" aria-labelledby="thanks-title">
  <div class="thanks-modal__backdrop" data-close></div>
  <div class="thanks-modal__panel">
    <span class="thanks-modal__icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </span>
    <h2 class="thanks-modal__title" id="thanks-title">¡Mensaje enviado!</h2>
    <p class="thanks-modal__text">Gracias por escribir. Te respondo lo antes posible.</p>
    <button class="btn btn--ghost" type="button" data-close>Cerrar</button>
  </div>
</div>

¿Prefieres escribir directamente? Estos son mis canales:

<ul class="contact-links">
  <li>✉️ <a href="mailto:{{ site.author.email }}">{{ site.author.email }}</a></li>
  <li>💼 <a href="{{ site.author.linkedin }}" target="_blank" rel="noopener">LinkedIn</a></li>
</ul>
