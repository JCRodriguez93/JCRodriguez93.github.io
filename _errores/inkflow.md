---
title: "Lo que no pudo verse en la defensa de DAW"
resumen: "Sin credenciales, sin la web en marcha y con la documentación fuera de foco: hoy de aquel despliegue solo quedan tres PDFs"
proyecto: inkflow
---

En 2025 presenté como proyecto intermodular de DAW la tienda online para un estudio de tatuajes que después reconstruí como [InkFlow](/proyectos/inkflow/). Este post-mortem no documenta un bug: no hubo código roto. Lo que falló fue algo que en un proyecto web pesa igual o más — **que el proyecto no llegara a verse usándose**.

---

## Qué no llegó a la defensa

Del sistema real, que funcionaba, no se enseñó prácticamente nada de lo que hace que una aplicación en producción sea una aplicación en producción:

- **Entrar y comprar**: había usuarios de prueba creados para eso, con sus credenciales; nunca llegaron a la mano de quien juzgaba. Nadie pudo entrar, navegar ni comprar.
- **Docker**: el conjunto se levantaba con Docker, y eso tampoco se mostró.
- **La base de datos**: vivía en **Clever Cloud**, enlazada con **MySQL Workbench**. Se habló de ella, pero sin que pudiera verse ni probarse.
- **La documentación**: existía, pero no acompañó la demo; quedó en un segundo plano.
- **Cómo se usaba la web**: dónde pinchar, qué hacía cada cosa, el recorrido completo. Lo más básico.

Resultado: se juzgó una superficie. Comprar, desplegar, consultar la BD — lo que yo sabía que estaba ahí dentro — quedó fuera de la pantalla.

Y, para ser justo con lo que pasó: **la defensa salió bien.** Aprobé el proyecto y con él obtuve el título del ciclo. Además, les pareció curioso el planteamiento — era el primer alumno que montaba el backend con Java, mientras el resto era PHP tras PHP — y eso puntúo mucho a mi favor. El problema no fue la nota; fue saber cuánto se quedó sin verse.

---

## Lo que dolió, y lo que no voy a hacer aquí

No vengo a reabrir aquello con rencor ni a señalar a nadie: los formatos de defensa son los que son, y esa baraja ya no se juega. La parte que sí es mía es la que dejé sin cubrir: debí asegurarme de que cualquiera pudiera entrar, comprar y ver cómo se desplegaba en dos minutos — con la demo levantada, las credenciales escritas en la primera diapositiva y la documentación a mano. De eso soy responsable, y de ahí sale la lección.

---

## Lo que hice después: construirlo otra vez

Lo más cabezón que he hecho como desarrollador: coger el proyecto y **reconstruirlo desde cero, a mi manera**. O estallaba el proyecto o estallaba yo, y decidí que fuera él.

La versión de hoy es [InkFlow](/proyectos/inkflow/): el backend que documenta su ficha, un frontend **Angular** que consume la API de verdad, y observabilidad y calidad encendidas de serie — **Prometheus**, **Grafana**, **SonarQube**. Y seguirá creciendo: el «recién titulado sin experiencia» que pide LinkedIn no se construye solo, así que le sigo metiendo stack hasta que esa frase deje de ser una ironía.

---

## Hoy, de todo aquello solo quedan los PDFs

Hechos comprobados, sin adornos:

| Qué era | Estado hoy |
|---|---|
| Web `jorgedaw.store` | **Dominio eliminado**: `Resolve-DnsName jorgedaw.store` devuelve `NXDOMAIN`, ya no resuelve |
| Base de datos en Clever Cloud | **Cuenta eliminada** |
| Repositorio del proyecto | **Eliminado por decisión propia**: sí llegó a tener su historial y sus ramas (`feature`, `fix`); de lo presentado no quise dejar ningún rastro |
| Guía técnica, guía de usuario y ficha de acceso | Los **3 PDFs originales**, conservados en [la ficha de InkFlow](/proyectos/inkflow/) |

La ficha de acceso enlaza una URL y un usuario de prueba que ya no existen. Se conserva igualmente: es la única huella que quedó de aquel despliegue.

---

## La lección

Dos, y las aplico aquí mismo:

1. **Enseñar un proyecto es enseñarlo usándose.** El código dentro no se ve en una defensa; lo que se ve es la demo. La demo levantada, las credenciales probadas y la documentación en mano no son un anexo: son la primera diapositiva.
2. **Lo que no conservas, no existe para nadie.** Este proyecto sí tuvo su repositorio, su historial y sus ramas (`feature`, `fix`); lo que no ha sobrevivido es porque **yo decidí** no dejar ningún rastro de lo presentado — me daba vergüenza aquella defensa y no quise volver a saber del proyecto nunca más. Consecuencia exacta: hoy no puedo enseñar aquello, solo contarlo, y de aquel despliegue solo sobreviven los PDFs porque los guardé. Por eso en este portfolio no repito el gesto: todo lo que enseño queda por escrito — documentos alojados en el propio sitio, comandos exactos, verificaciones que cualquiera puede repetir — y por eso este post-mortem termina en una tabla, no en una promesa.

**La versión actual:** [InkFlow](/proyectos/inkflow/) · **Documentos de 2025:** [guía técnica](/assets/docs/inkflow/technical-guide.pdf) · [guía de usuario](/assets/docs/inkflow/user-guide.pdf) · [ficha de acceso](/assets/docs/inkflow/url_jorgedaw.store_usuario_usuariodeejemplo@gmail.com.pdf)
