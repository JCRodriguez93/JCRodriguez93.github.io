---
title: "Scafftrix — Fábrica de software interna"
tipo: "Fábrica de software"
orden: 2
resumen: "Intranet Java que genera proyectos estandarizados (Spring Boot, Batch y microservicio contract-first) desde un formulario: plantillas dentro del JAR, generación asíncrona con SSE y descarga en ZIP. 228 tests."
stack:
  - Spring Boot 3.4
  - Spring MVC + Thymeleaf
  - Spring Data JPA (H2)
  - SSE (generación asíncrona)
  - Docker multistage
  - JUnit 5 + JaCoCo
repo: "https://github.com/JCRodriguez93/Scafftrix"
demo: ""
contrato: ""
---

## 1. El contexto

**Scafftrix** es una fábrica de software interna (intranet) que genera proyectos Java estandarizados desde un formulario web: eliges un perfil, rellenas unos pocos datos y descargas un ZIP listo para compilar. Nació de un problema concreto y repetitivo: montar el esqueleto de un proyecto Spring a mano implica tomar las mismas 30 decisiones cada vez (estructura de paquetes, dependencias, contrato, tests, Docker), y hacerlo a mano garantiza que dos proyectos "iguales" acaben distintos.

La propuesta es trasladar esas decisiones a **plantillas versionadas dentro de la propia aplicación** y exponerlas detrás de un formulario que oculta la complejidad: sin CLI externa, sin Node, sin JHipster — solo una intranet con la que cualquier compañero podría generar un proyecto conforme al estándar en un minuto.

## 2. Qué construí

Un portal Spring MVC + Thymeleaf con tres perfiles de generación y todo el ciclo de vida del proyecto generado:

- **Tres perfiles**: `SPRING_BOOT` (web con Thymeleaf + contrato OpenAPI), `SPRING_BATCH` (proceso batch real: lector, procesador, writer, listener y manejo de errores) y `SPRING_MICROSERVICE` (contract-first con layout hexagonal, migraciones Flyway y `docker-compose` con PostgreSQL).
- **Generación asíncrona**: los trabajos corren en un executor dedicado, el progreso se emite por **SSE** y el estado terminal persiste en H2.
- **Historial de proyectos**: listado con búsqueda, filtros por tipo/estado, ordenación y paginación; CRUD completo donde la información descriptiva es editable pero **la identidad técnica (tipo, stack) es inmutable**, y editar/eliminar devuelve `409` mientras hay una generación en curso.
- **Guardia corporativa**: un validador falla el arranque si la configuración desplegada se desvía del estándar (H2/Thymeleaf/Maven) — el estándar no es documentación, es una comprobación.
- **Logging estructurado de serie**: los tres perfiles generan proyectos con su `logback-spring.xml` —salida a consola y a `logs/app.log` en JSON (Logstash)—, listos para un agregador de logs sin retoques. El monolito ya lo traía; la mejora añadida a las plantillas de batch y microservicio es que los tres perfiles entreguen el mismo estándar.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/scafftrix/scafftrix.gif' | relative_url }}" alt="Dashboard del portal Scafftrix con las métricas de proyectos generados por perfil y los accesos a crear proyectos o ver el historial" loading="lazy">
  <figcaption>El dashboard del portal: proyectos generados por perfil y accesos a crear un proyecto nuevo o consultar el historial.</figcaption>
</figure>

## 3. El motor de generación

El corazón es la decisión de **renderizar plantillas que viajan dentro del JAR** en lugar de invocar una herramienta externa:

- Cada perfil tiene su raíz de plantilla (`project-template`, `project-batch-template`, `project-microservice-template`) con su propio `pom.xml`, estructura y verificación de ficheros obligatorios.
- Los marcadores usan **`@token@`** (`@packagePath@`, `@springBootVersion@`, `@applicationClass@`...) en lugar de `${...}`: con `@` como delimitador, las expresiones de Maven propias de los `pom.xml` incluidos en la plantilla **sobreviven intactas** al renderizado. Es el tipo de detalle que solo se descubre cuando el primer `pom.xml` generado sale corrupto.
- Solo dos decisiones las elige el usuario (versión de Spring Boot de una lista blanca y formato de configuración); el resto va fijado por perfil, de modo que un proyecto generado nunca lleva dos `application.properties` compitiendo.
- El perfil de microservicio es **contract-first dentro del contrato**: su plantilla incluye `contract/api.yaml` como fuente de verdad y genera un layout hexagonal (`domain`, `application`, `infrastructure`, `api`), replicando el enfoque que aplico en mis proyectos backend.

## 4. Decisiones técnicas y seguridad

**Límite testeable.** Toda la estrategia de generación está tras la interfaz `ProjectGenerator`, con una única implementación (`TemplateProjectGenerator`) por la que pasan los tres perfiles: se prueba una vez a fondo y los perfiles la reutilizan.

**Seguridad desde el diseño.** Ninguna entrada del usuario se usa para construir rutas del sistema de ficheros: los espacios de trabajo se identifican solo por **UUID** y las rutas se verifican con `startsWith` antes de escribir (defensa contra path traversal), y los ficheros generados se escriben en UTF-8 sin BOM.

**Despliegue todo-en-Docker.** `Dockerfile` multistage: Maven + JDK solo en la etapa de build, runtime con JRE únicamente (la imagen bajó de ~1,29 GB a 660 MB al eliminar la dependencia de herramientas externas). El `docker-compose` endurece el contenedor (`read_only`, `no-new-privileges`, descenso a usuario sin privilegios con `setpriv`) y persiste el estado con bind mounts para que `docker compose down` no borre el historial.

**Respuesta a la concurrencia.** Un único proceso por base H2 (un solo escritor): la documentación y el diseño asumen esa restricción explícitamente en lugar de ignorarla.

## 5. Cómo ejecutarlo

```bash
docker compose build     # compila el JAR dentro de la imagen
docker compose up -d
```

- Portal: `http://localhost:8090`
- Salud: `curl -s http://localhost:8090/actuator/health` (el contenedor debe estar `healthy`)
- Tests: `mvn clean verify` (228 tests + informe JaCoCo en `target/site/jacoco/`)

## 6. Resultados y aprendizajes

**228 tests con ~95% de cobertura**, cubriendo las capas unitaria, MVC (`@WebMvcTest`) y persistencia (`@DataJpaTest`), incluido el ciclo completo del CRUD y la verificación de que **cada perfil generado compila** — el generador se testea generando y compilando.

**Bugs en mi propia fábrica.** Usar Scafftrix en serio —adaptar su salida a un caso real, y mirar el README y el ZIP que entrega— destapó **cuatro** defectos propios de la fábrica, y los cuatro se habrían repetido en **cada** generación: el perfil `SPRING_BATCH` no incluía `spring-boot-starter-batch-jdbc` (Boot 4 separó el soporte JDBC del JobRepository, así que el job corría `COMPLETED` sin persistir historial ni crear las tablas `BATCH_*`); el *resource filtering* de Maven reescribía `@artifactId@` → `scafftrix` dentro de los `application.*` de las plantillas al empaquetar el JAR; el `README.md` de la plantilla de microservicio tenía la versión de Spring Boot hardcodeada a `3.4.x` aunque el `pom.xml` generara la elegida (4.1.1); y el ZIP se entregaba con la carpeta raíz `source/` en lugar del nombre del proyecto, con el README de cada repo enterrado fuera de la raíz. Los cuatro están corregidos y verificados —228 tests en verde y regeneración real incluida—. El análisis completo, con la comprobación de cada fix, está en los dos post-mortems: [errores al adaptar conciliacion-batch](/errores/conciliacion-batch/) y [errores de empaquetado y entrega](/errores/scafftrix/).

**Lo que haría diferente hoy:**

- **PostgreSQL para el estado del portal.** H2 deja el portal atado a una sola instancia (un solo escritor); para un despliegue redundante migraría el historial a PostgreSQL, igual que ya hice en InkFlow.
- **CI/CD.** `mvn verify` con JaCoCo es local; correrlo en GitHub Actions en cada commit habría dado el mismo hábito que en mis otros proyectos.
- **Contrato de las plantillas.** Formalizaría qué ficheros y marcadores debe contener cada perfil como un esquema validado en tests, en lugar de la comprobación lista-a-manos que hay hoy.

**Puente con mi perfil.** Scafftrix es donde aplico mi enfoque contract-first "al revés": no solo diseño contratos para mis APIs, sino que genero proyectos que nacen con contrato. Los perfiles de Batch y microservicio son, además, la forma que tengo de mantener viva mi práctica con Spring Batch y las arquitecturas hexagonales.
