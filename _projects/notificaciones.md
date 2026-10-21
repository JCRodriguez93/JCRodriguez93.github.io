---
title: "Servicio de notificaciones"
tipo: "Microservicios"
orden: 4
resumen: "Microservicio contract-first generado con Scafftrix y adaptado a notificaciones: registra el envío, lo entrega por un puerto desacoplado (hoy un adaptador de log) y persiste el estado final ENVIADO/FALLIDO. 20 tests."
stack:
  - Spring Boot 4.1
  - Spring MVC
  - Spring Data JPA + Flyway
  - OpenAPI 3 (contract-first)
  - MapStruct
  - H2 / PostgreSQL
  - SLF4J + Logback
  - JUnit 5
  - Postman
  - Docker Compose
repo: "https://github.com/JCRodriguez93/notificaciones-ms"
demo: ""
contrato: "https://github.com/JCRodriguez93/notificaciones-ms/blob/master/src/main/resources/contract/api.yaml"
---

## 1. El origen: lo generó mi fábrica de software

Este proyecto **empezó siendo el que genera [Scafftrix](/proyectos/scafftrix/) desde su perfil `SPRING_MICROSERVICE`**: un microservicio contract-first con layout hexagonal, migraciones Flyway, OpenAPI como fuente de verdad y un CRUD de usuarios y centros de ejemplo. Lo nombré `notificaciones-ms` en el formulario del portal, descargué el ZIP y lo abrí sin tocar un fichero: el resultado coincide fichero a fichero con la plantilla renderizada, solo con los tokens sustituidos.

Después cambié **el dominio**, que era lo único de ejemplo: usuarios y centros pasaron a ser notificaciones. La arquitectura, los puertos, los mappers y los tests de la plantilla aguantaron el cambio casi sin tocarlos — lo mismo que me pasó adaptando el perfil de [batch](/proyectos/conciliacion-batch/).

## 2. Qué hace

Tres endpoints, definidos en el contrato `contract/api.yaml` antes de escribir una línea de Java:

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/notificaciones` | Registra y envía una notificación (201 con su estado final) |
| `GET` | `/notificaciones` | Lista las notificaciones registradas |
| `GET` | `/notificaciones/{id}` | Devuelve una notificación por id |

El cliente solo envía `destinatario`, `asunto` y `cuerpo`. El `id` y el `estado` los asigna el servidor, que recorre `PENDIENTE` → `ENVIADO` (o `FALLIDO` con su `motivoFallo`).

Una decisión de dominio: **las notificaciones son inmutables**. No hay `PUT` ni `DELETE`, porque una notificación es un registro de envío, no un recurso editable. Si hay que repetirla, se crea otra.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/notificaciones-ms/notificaciones-ms.gif' | relative_url }}" alt="Postman ejecutando GET /notificaciones contra el puerto 8080 con respuesta 200 OK y el listado de notificaciones con su estado" loading="lazy">
  <figcaption>GET /notificaciones en Postman: el listado con el estado final que asigna el servidor, tal y como lo define el contrato.</figcaption>
</figure>

## 3. Lo desacoplado: el puerto `Notificador`

La pieza que da sentido al proyecto es un puerto de salida:

```java
public interface Notificador {
    ResultadoEnvio enviar(String destinatario, String asunto, String cuerpo);
}
```

`NotificacionService` primero guarda la notificación como `PENDIENTE`, luego llama al puerto y por último persiste el estado final. El adaptador que hay hoy, `LoggingNotificador`, deja constancia en el log y no necesita ninguna infraestructura.

El motivo de hacerlo así es que **sustituirlo por algo real no toca el dominio ni el caso de uso**: un adaptador SMTP, o una cola con su consumidor, entran por la misma interfaz. Eso es lo que compra la arquitectura hexagonal que trae la plantilla.

Además un fallo de envío **no lanza excepción**, devuelve `ResultadoEnvio.fallo("motivo")`: es un resultado esperado que hay que registrar, no un error que deba tumbar el proceso.

## 4. Decisiones de diseño

**Contrato antes que código.** El `api.yaml` es la fuente de verdad y OpenAPI Generator genera a partir de él la interfaz `NotificacionesApi` y los modelos. El controlador solo implementa esa interfaz; el dominio no sabe que existe HTTP.

**La traducción de estados vive en los mappers.** El estado es un enum en el dominio (`EstadoNotificacion`) y otro distinto en el modelo generado (`EstadoEnum`). MapStruct los cruza en cada frontera en lugar de propagar cadenas por todo el código.

**Registrar antes de enviar.** Si el envío fallara de forma abrupta, el registro ya está en base de datos y se puede auditar o reintentar. El orden `PENDIENTE → enviar → estado final` no es casual, y cada paso queda en el log: el registro inicial en DEBUG, cada envío con su resultado en INFO —o WARN con el motivo si falla—, y los `4xx` en WARN desde el manejador de errores.

## 5. Qué no está (y por qué)

Esta ficha **no** describe un servicio con mensajería, y conviene que quede claro para no vender algo que no existe:

- **No hay RabbitMQ ni ninguna cola.** El envío es síncrono, a través del puerto.
- **No hay SMTP ni proveedor de email real.** El adaptador escribe en el log.
- **No hay DLQ, reintentos ni idempotencia.** Serían el siguiente paso junto al adaptador real.

Llegar ahí no exigiría reescribir el proyecto: añadir un adaptador `Notificador` sobre Spring AMQP y una tabla de mensajes ya procesados entrarían por el puerto que ya existe. Pero eso hoy está en el roadmap, no en el código, y en un portfolio prefiero decirlo así antes que poner "RabbitMQ" en el stack y que quien abra el repo no lo encuentre.

## 6. Cómo ejecutarlo

```bash
git clone https://github.com/JCRodriguez93/notificaciones-ms.git && cd notificaciones-ms
mvn -DskipTests package
java -jar target/notificaciones-ms-1.0.0-SNAPSHOT.jar --spring.profiles.active=local   # requiere Java 17+

# o solo los tests
mvn test
```

Arranca con H2 en memoria y Flyway carga datos de ejemplo (2 `ENVIADO`, 1 `FALLIDO` con motivo). Swagger UI en `http://localhost:8080/swagger-ui.html`. Para PostgreSQL, `docker compose up --build` con `POSTGRES_PASSWORD` definida.

## 7. Resultados y aprendizajes

**20 tests en verde**, cubriendo el arranque del contexto con Flyway validando el esquema, los mappers (incluido el cruce de enums), el caso de uso con el `Notificador` simulado, la persistencia contra H2 (`@DataJpaTest`) y los endpoints (`@WebMvcTest`). Verificado además contra la API real: `POST` devuelve `ENVIADO`, un id inexistente devuelve `404` con `ProblemDetail` y un payload sin campos obligatorios devuelve `400`.

**Lo que me llevo:** el esqueleto que genera Scafftrix aguantó el cambio de dominio sin tocar la arquitectura, igual que el de batch. Cambiar de "usuarios" a "notificaciones" fue redefinir el contrato, el modelo y los tests; los puertos, los mappers y la estructura hexagonal se quedaron donde estaban.

**Lo que haría diferente:** añadir el adaptador real y el broker de cara a una segunda versión, y desde el principio guardar `creadoEn`/`actualizadoEn` para poder auditar cuándo se envió cada cosa — hoy el estado está, pero el calendario no.
