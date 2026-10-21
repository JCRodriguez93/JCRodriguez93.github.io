---
title: "API de Gestión de Inventario"
tipo: "Monolito modular"
orden: 3
resumen: "Control de stock multi-almacén con alertas de mínimo. Monolito modular generado con Scafftrix y adaptado al dominio: contrato OpenAPI de 8 endpoints y cero DTOs escritos a mano. 24 tests."
stack:
  - Spring Boot 4.1
  - Spring MVC
  - Spring Data JPA
  - OpenAPI 3 (contract-first)
  - MapStruct
  - H2 / MySQL
  - JUnit 5 + MockMvc
  - Postman
  - SLF4J + Logback (consola + JSON)
  - Docker Compose
repo: "https://github.com/JCRodriguez93/inventario-api"
demo: ""
contrato: "https://github.com/JCRodriguez93/inventario-api/blob/master/src/main/resources/contract/api.yaml"
---

## 1. El origen: lo generó mi fábrica de software

Este proyecto **empezó siendo el que genera [Scafftrix](/proyectos/scafftrix/) desde su perfil `SPRING_BOOT`**: un monolito Spring Boot con contrato OpenAPI, MapStruct, H2 con `schema.sql`/`data.sql`, Thymeleaf y dos módulos CRUD de ejemplo (centros y empleados). Descargué el ZIP y lo abrí sin tocar un fichero.

Después cambié el dominio, y aquí el cambio fue bastante más profundo que renombrar entidades:

- **Reescribí el contrato entero.** El de la plantilla tenía 10 operaciones de centros y empleados; este tiene 8 de inventario. Con él se regeneraron los modelos y las interfaces de los controllers.
- **Los módulos de ejemplo desaparecieron** y los del inventario entraron siguiendo el mismo patrón de la plantilla: `controller → service → repository` con sus entidades y mappers.
- **Fuera quedó lo que no iba a usar:** Thymeleaf (la plantilla lo traía para plantillas que no existían) y el `schema.sql`/`data.sql` amarrados a H2, sustituidos por un esquema que dibuja Hibernate sobre cualquier base y un sembrador de datos idempotente.
- **Dentro, lo que la plantilla no trae:** MySQL con Docker Compose y el manejo global de errores (`ApiExceptionHandler` con el cuerpo `ApiError` del contrato). El logging estructurado —`logback-spring.xml` con salida a consola y a `logs/app.log` en JSON (Logstash)— sí venía de la plantilla; lo que añadí sobre él fue el logging en el código: SLF4J en cada servicio, en el sembrador y en el manejador de errores.

## 2. Qué hace

Ocho endpoints, definidos en `src/main/resources/contract/api.yaml` antes de escribir el primer controlador:

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/referencias` | Lista las referencias |
| `POST` | `/api/v1/referencias` | Crea una referencia (201; `409` si el SKU ya existe) |
| `PUT` | `/api/v1/referencias/{sku}` | Actualiza nombre y stock mínimo (`404` si no existe) |
| `GET` | `/api/v1/stock/{sku}` | Cantidades de una referencia en cada almacén (`404`) |
| `GET` | `/api/v1/movimientos` | Historial paginado (`page`, `size`) |
| `POST` | `/api/v1/movimientos` | Registra una entrada o salida de stock (201) |
| `GET` | `/api/v1/movimientos/{id}` | Detalle de un movimiento (`404`) |
| `GET` | `/api/v1/alertas` | Referencias con stock total por debajo de su mínimo |

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inventario/inventario-api.png' | relative_url }}" alt="Colección de Postman del proyecto inventario-api con los endpoints agrupados por verbo en las carpetas GET, POST y PUT" loading="lazy">
  <figcaption>Los mismos ocho endpoints del contrato, agrupados por verbo en la colección de Postman.</figcaption>
</figure>

Tres decisiones que ya están dentro del contrato, no escondidas en el código:

- **El `409` está documentado.** Una `SALIDA` sin stock suficiente es un error de negocio y el contrato lo dice: devuelve `{"status":409,...,"message":"Stock insuficiente en el almacén CENTRAL: disponibles 12, solicitado 999"}`. Sin eso, el cliente no podría distinguirlo de un fallo del servidor.
- **La paginación solo donde aporta.** El historial de movimientos pagina; las consultas por SKU devuelven un conjunto acotado y no la necesitan. El criterio (`page`/`size`, con el tamaño acotado entre 1 y 100) vive en el contrato.
- **La validación sale del propio `yaml`.** `sku` y `nombre` obligatorios con longitud ≥ 1, `cantidad` ≥ 1: openapi-generator traduce eso a `@NotNull`, `@Size` y `@Min` en el modelo generado y el controller los aplica con `@Valid`.

## 3. Sin DTOs: contrato, entidad y mapper

Es el patrón que define el proyecto y la razón por la que el stack de esta ficha no menciona DTOs. Solo hay tres piezas:

1. **El modelo del contrato** (`org.openapitools.model.Referencia`, `Movimiento`, `Alerta`...) — generado del `api.yaml`, nunca escrito a mano.
2. **La entidad JPA** (`ReferenciaEntity`, `MovimientoEntity`...) — privada de su módulo.
3. **El mapper MapStruct** — la única frontera entre ambos:

```java
@Mapper(componentModel = "spring")
public interface ReferenciaMapper {
    Referencia toModel(ReferenciaEntity entity);
    ReferenciaEntity toEntity(Referencia model);
}
```

El controller implementa la interfaz generada y trabaja solo con modelos del contrato:

```java
@Override
public ResponseEntity<Movimiento> createMovimiento(@Valid Movimiento movimiento) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(movimiento));
}
```

Los repositories devuelven entidades y jamás modelos; los controllers devuelven modelos y jamás entidades. Si mañana cambia una ruta o un campo en el `yaml`, cambia el contrato, se regenera y el compilador señala exactamente qué mapper hay que ajustar.

## 4. Fronteras y transacción

```
es.scafftrix.inventarioapi
├── stock/        # referencias y niveles por almacén
│   ├── api/      # StockConsulta: frontera pública del módulo
│   ├── controller/ entity/ exception/ mapper/ repository/ service/
├── movimientos/  # entradas, salidas e historial
├── alertas/      # regla de stock mínimo
└── config/       # @ControllerAdvice + sembrador de datos
```

La regla es que **los módulos no se tocan entre sí**: `movimientos` y `alertas` consumen `stock` solo a través de su API pública:

```java
public interface StockConsulta {
    List<Referencia> referencias();
    List<NivelStock> stockPorSku(String sku);
    int stockTotal(String sku);
    void aplicarMovimiento(String sku, String almacen, int delta);
}
```

`alertas` no tiene entidad ni tabla: lee las referencias y sus totales por esa interfaz y devuelve las que están bajo mínimo. Si algún día quisiera salir como servicio aparte, su frontera ya está dibujada.

**La operación crítica es una sola transacción.** En `MovimientoService.create` se comprueba la disponibilidad, se ajusta el stock y se guarda el movimiento dentro de un `@Transactional`. Si falta stock, lanza `StockInsuficienteException` antes de tocar nada y no se persiste ni una fila. El `@RestControllerAdvice` de `config` traduce después las excepciones del dominio a los códigos que promete el contrato (`404`, `409`, `400` de validación y `500`) con el cuerpo `ApiError` definido en el propio `yaml`, y deja constancia de cada una: los `4xx` en WARN, los inesperados en ERROR con su traza completa.

## 5. Qué no está (y por qué)

Para no vender en el stack algo que quien abra el repo no encuentra:

- **No hay Spring Security ni JWT.** Es una API abierta; la autenticación queda fuera del alcance definido para esta versión.
- **No hay Testcontainers.** La suite de integración corre sobre H2 en memoria; el MySQL real lo he verificado levantándolo con Docker Compose y golpeando la API, no dentro de `mvn test`.
- **No hay Swagger UI.** La plantilla del monolito no incluye springdoc y no lo añadí: el contrato es el fichero `api.yaml`, que es la fuente de verdad real del proyecto.
- **No hay Flyway.** El esquema lo crea Hibernate con `ddl-auto=update`; es lo primero que migraría a migraciones versionadas.
- **No hay frontend.** Thymeleaf de la plantilla fuera: el alcance es la API.

## 6. Cómo ejecutarlo

```bash
docker compose up -d                              # MySQL 8 en el puerto 3306
mvn spring-boot:run -Dspring-boot.run.profiles=mysql

# sin Docker (H2 en memoria)
mvn spring-boot:run

# tests
mvn test
```

- API: `http://localhost:8080/api/v1/...`
- Primera arrancada con la base vacía siembra 3 referencias (`TORN-M6-100`, `CAJA-300`, `ETI-50`) y sus almacenes.
- Para verlo en dos llamadas: `GET /api/v1/alertas` devuelve `CAJA-300` y `ETI-50`, y un `POST /api/v1/movimientos` de salida de 999 `CAJA-300` en `CENTRAL` devuelve `409`.
- Los logs van a consola y a `logs/app.log` (JSON estructurado): INFO en cada movimiento registrado, alertas de stock bajo y altas de referencia; WARN en los `4xx`; ERROR con traza en lo inesperado.

<figure class="project-detail__media">
  <img src="{{ '/assets/images/inventario/inventario-api.gif' | relative_url }}" alt="Postman ejecutando GET /api/v1/referencias contra el puerto 8080 y recibiendo un 200 OK con las tres referencias de la siembra inicial" loading="lazy">
  <figcaption>GET /api/v1/referencias tras la primera arrancada: 200 OK con las tres referencias de la siembra.</figcaption>
</figure>

## 7. Resultados y aprendizajes

**24 tests en verde** (`mvn test`): 15 unitarios con Mockito sobre las reglas del dominio —comprobación de stock antes de descontar, `409`, delta de movimiento, paginación y alertas— y 9 de integración con MockMvc sobre el contexto completo: siembra, listados, el `409` con su cuerpo, el `404` de un SKU inexistente, el `400` de validación y la paginación con `size=0` corregida a 1.

Verificado además contra **MySQL real en contenedor**: las tres tablas las creó Hibernate en MySQL 8, una salida de 10 unidades dejó el almacén `NORTE` en 30, el `409` llegó con su mensaje y `Caja de cartón` se guardó y devolvió en UTF-8 intacto.

**Lo que me llevo:** cambiar el dominio de un proyecto generado exige reescribir el contrato primero y dejar que la generación arrastre el resto; el patrón sin DTOs aguanta eso muy bien porque solo hay tres piezas que recolocar. Y verificar el stack contra una base real (no solo contra H2 en memoria) es lo que convierte "uso MySQL" en algo que puedo defender.

**Lo que haría diferente:** migraciones con Flyway desde el primer commit en lugar de `ddl-auto`, tests de integración con Testcontainers para que la suite corra contra el mismo MySQL que la producción, y springdoc para servir el contrato en navegador.
