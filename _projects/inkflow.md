---
title: "InkFlow API — Backend para estudio de tatuajes"
tipo: "Monolito modular"
orden: 1
resumen: "API REST de e-commerce para un estudio de tatuajes: catálogo, pedidos, facturas PDF y usuarios. Contrato OpenAPI contract-first con generación de código, JWT RS256 y 881 tests con gate de cobertura."
stack:
  - Spring Boot 3
  - Spring Security (JWT)
  - Spring Data JPA
  - PostgreSQL + Flyway
  - OpenAPI 3 (contract-first)
  - JUnit 5 + Mockito
  - Docker
  - Angular (frontend)
  - Prometheus + Grafana
  - SonarQube
repo: ""
demo: ""
contrato: ""
---

## 1. El contexto

**InkFlow API** es el backend de una tienda online para un estudio de tatuajes: nació como el proyecto intermodular de mi ciclo de **DAW (Desarrollo de Aplicaciones Web)**; la versión que documento aquí es una **reconstrucción desde cero**, hecha en mi tiempo libre, hasta convertirla en mi banco de pruebas personal de **Spring Boot**. Es el proyecto donde he trabajado a mayor escala y del que más he aprendido de backend.

El sistema está pensado como una tienda completa: catálogo con categorías y marcas, carrito, pedidos, facturas, cupones, reseñas, wishlists y gestión de usuarios y roles. El frontend (Angular) existe, pero el foco de este portfolio —y de mi perfil— es el **backend Java/Spring**, que es lo que documento aquí.

## 2. El proyecto de DAW (2025)

Lo que presenté en 2025 como proyecto intermodular de DAW quedó documentado entonces en tres PDFs, que conservo como punto de partida:

- [Guía técnica del proyecto (PDF)]({{ '/assets/docs/inkflow/technical-guide.pdf' | relative_url }})
- [Guía de usuario del proyecto (PDF)]({{ '/assets/docs/inkflow/user-guide.pdf' | relative_url }})
- [Ficha de acceso a la web desplegada en jorgedaw.store (PDF)]({{ '/assets/docs/inkflow/url_jorgedaw.store_usuario_usuariodeejemplo@gmail.com.pdf' | relative_url }})

De aquella web ya no queda nada en la red: ni dominio ni servidor. Qué ocurrió en la defensa, cómo se reconstruyó el proyecto después y qué me llevo lo dejo en el post-mortem [«Lo que no pudo verse en la defensa de DAW»](/errores/inkflow/).

## 3. Qué construí

Una API REST con unos **80 endpoints** agrupados en **14 módulos** (catálogo de productos, pedidos, carrito, facturación, usuarios, cupones, reseñas, wishlists, contacto, notificaciones push...), sobre un esquema PostgreSQL de **26 tablas** gestionado con Flyway.

Flujos principales que funcionan de punta a punta:

- **Autenticación y autorización**: registro, login, refresh token y control de acceso por roles (ADMIN/USER) en cada endpoint.
- **Catálogo**: productos con categorías, subcategorías, marcas, proveedores, promociones, stock e imágenes, con traducciones a 5 idiomas.
- **Compra**: carrito → pedido → descuento atómico de stock → factura PDF generada automáticamente (Thymeleaf + Flying Saucer).
- **Operación**: reseñas, wishlists, cupones con control de uso, mensajes de contacto con rate limiting y notificaciones push (Web Push con VAPID).

## 4. Contract-first: el contrato manda

Este es el proyecto donde apliqué de verdad el enfoque **contract-first**, y es lo que más me ha marcado:

1. El punto de partida fue `src/main/resources/contract/api.yaml`, el contrato OpenAPI 3 de toda la API.
2. Con el **OpenAPI Generator** (plugin de Maven, modo `interfaceOnly`) se generan del contrato los **interfaces de controlador y los DTOs**; yo implemento los interfaces generados, no los escribo a mano.
3. **MapStruct** se encarga del mapeo Entity ↔ DTO sin boilerplate.
4. Un test (`OpenApiValidatorTest`) **valida las respuestas contra el contrato**, así que si la implementación se desvía del `api.yaml`, el build falla.

El resultado: el contrato y el código no pueden desincronizarse, y Swagger UI (`/api/swagger-ui.html`) sirve de documentación interactiva siempre actualizada porque nace del mismo artefacto.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inkflow/inkflow-api.gif' | relative_url }}" alt="Demostración de InkFlow API: recorrido por la tienda y documentación Swagger" loading="lazy">
  <figcaption>InkFlow en funcionamiento: la tienda (frontend Angular) consumiendo la API y su documentación Swagger.</figcaption>
</figure>

## 5. Decisiones técnicas

**Monolito modular.** Cada módulo (`product`, `order`, `cart`, `user`...) es autocontenido con sus capas internas (controller → service → repository) y se comunica por su API pública. Elegí monolito modular porque el dominio es de una sola tienda, el equipo es de una persona y una transacción de carrito→pedido necesita consistencia que un despliegue distribuido complicaría; pero los límites de módulo están dibujados para poder extraer un servicio si algún día lo exigiera el problema.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inkflow/inkflow-monolito-modular.png' | relative_url }}" alt="Captura del IDE con la estructura de paquetes del monolito modular" loading="lazy">
  <figcaption>Los módulos como paquetes autocontenidos: aquí se ve <code>product</code> desplegado con sus capas (controller, entity, exception, mapper, repository, service).</figcaption>
</figure>

**Seguridad con OAuth2 Resource Server.** JWT **RS256** (asimétrico) validado con el Resource Server de Spring, roles extraídos del claim del token, refresh tokens con rotación, CORS con allowlist estricta y filtro de rate limiting por IP en los endpoints sensibles (login, registro, contacto). El registro nunca permite autoasignarse rol ADMIN.

**Datos con criterio de producción.** Esquema versionado con **Flyway** (`V1` esquema + `V2` datos de demostración) y `ddl-auto: validate`, de modo que si el modelo de entidades y el esquema migrado no coinciden, **la aplicación no arranca**. Bloqueo optimista con `@Version` en producto y descuento de stock con `UPDATE ... WHERE stock_quantity >= ?` para evitar overselling bajo concurrencia.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inkflow/inkflow-sql.png' | relative_url }}" alt="Captura del IDE con las migraciones Flyway del proyecto" loading="lazy">
  <figcaption>Migraciones Flyway en <code>src/main/resources/db/migration</code>: <code>V1__init_schema.sql</code> define el esquema y <code>V2__seed_data.sql</code> aporta los datos de demostración.</figcaption>
</figure>

**Tests como red de seguridad.** **881 tests, 0 fallos** (~100 clases de test): unitarios con JUnit 5 + Mockito sin levantar contexto Spring, tests de la cadena de seguridad real sobre MockMvc, tests de integración con `@SpringBootTest` contra PostgreSQL y tests de concurrencia con `CountDownLatch`/`ExecutorService` para validar el bloqueo de stock. El build de Maven tiene un **gate de JaCoCo en `verify`** (≥80% líneas/instrucciones, ≥70% ramas): si la cobertura baja, el build no pasa.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inkflow/inkflow-tests.gif' | relative_url }}" alt="Demostración de un test de controlador con JUnit 5 y Mockito en el IDE" loading="lazy">
  <figcaption>Un test de controlador en detalle: JUnit 5 + Mockito (<code>@ExtendWith</code>, <code>@Mock</code>, <code>@InjectMocks</code>) probando <code>CategoryController</code> sin levantar el contexto Spring.</figcaption>
</figure>

**Despliegue con Docker.** `Dockerfile` multistage (build Maven → runtime JRE sobre `amazoncorretto:17`) y `docker-compose` con PostgreSQL, backend y stack de métricas (Actuator + Prometheus).

## 6. Cómo ejecutarlo

```bash
git clone <repo> && cd backend
docker compose up -d postgres     # o el compose completo de la raíz
./mvnw spring-boot:run            # perfil dev por defecto
```

- API: `http://localhost:8080/api/...`
- Swagger UI: `http://localhost:8080/api/swagger-ui.html`
- Tests: `./mvnw verify` (ejecuta tests + gate JaCoCo)
- Requisitos: JDK 17, Docker (para PostgreSQL y el compose)

## 7. Resultados y aprendizajes

El proyecto cumple su objetivo aunque no representa mi nivel actual de backend junior (no tiendo a considerar que algo que haya IA de por medio sea algo que fuese capaz de construir totalmente sin ella), pese a todo, estos son los logros obtenidos en dicho proyecto: API completa, documentada por contrato, segura y con una red de tests que permite refactorizar con confianza.

**Lo que haría diferente hoy (y es mi mayor aprendizaje):**

- **Empezaría por un MVP y crecería por iteraciones.** El alcance se me fue: 14 módulos y funcionalidades como push notifications o traducciones multi-idioma son lindas de tener, pero un producto real prioriza. Hoy definiría un núcleo (catálogo + carrito + pedido + factura) y añadiría el resto solo con justificación.
- **Testcontainers en lugar de BD local.** Los tests de integración hoy apuntan a una PostgreSQL local por variables de entorno; con Testcontainers cada test tendría su propio contenedor y el setup sería reproducible en cualquier máquina sin prerequisitos.
- **CI/CD desde el día uno.** El gate de cobertura local es bueno, pero correr `mvnw verify` en GitHub Actions en cada PR habría evitado regresiones y habría sido un hábito desde el principio.

**Puente con el resto de mi perfil.** De aquí vienen mis bases de Spring Security, JPA + migraciones versionadas y, sobre todo, del enfoque contract-first que aplico en el resto de mis proyectos Java.
