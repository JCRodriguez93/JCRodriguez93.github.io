---
title: "Conciliación de facturas contra pagos (Spring Batch)"
tipo: "Batch (Spring Batch)"
orden: 5
resumen: "Adaptación del batch de Scafftrix a un caso real: concilia facturas contra pagos en dos steps, marca estados en H2 y lo verifica con un test de integración. 7 facturas y 6 pagos → 3 conciliadas, 1 importe no coincide, 1 pendiente."
stack:
  - Spring Boot 4.1
  - Spring Batch
  - JDBC + H2
  - SLF4J + Logback
  - Java 17
  - JUnit 5
repo: "https://github.com/JCRodriguez93/conciliacion-batch"
demo: ""
contrato: ""
---

## 1. El origen: lo generó mi fábrica de software

Este proyecto **empezó siendo el que genera [Scafftrix](/proyectos/scafftrix/) desde su perfil `SPRING_BATCH`**: un job de importación de empleados CSV. Lo nombré `conciliacion-batch` en el formulario del portal, descargué el ZIP y lo abrí sin tocar un fichero — el resultado coincide fichero a fichero con la plantilla renderizada, solo con los tokens sustituidos.

Pero esta ficha cuenta lo que pasó **después**: convertir ese esqueleto genérico en un caso de negocio real. El esqueleto de batch aguantó el cambio de dominio; el ecosistema alrededor no fue tan amable. De todo lo que se rompió escribí un [post-mortem honesto](/errores/conciliacion-batch/).

## 2. Qué hace el job

Dos steps encadenados, `conciliacionJob`, chunk-oriented de 3 en 3:

- **`stepFacturas`**: lee `facturas.csv` (7 facturas), el processor descarta las inválidas (importe negativo, fecha mal formada) y un `JdbcBatchItemWriter` las inserta como `PENDIENTE` en la tabla `facturas`.
- **`stepPagos`**: lee `pagos.csv` (6 pagos), y por cada uno consulta la factura correspondiente, compara importes con `BigDecimal` y escribe el estado final: `CONCILIADA` si coinciden, `IMPORTE_NO_COINCIDE` si no. Un pago sin factura que conciliar queda fuera.

Resultado verificado con test y en ejecución real:

| Estado | Facturas |
|---|---|
| `CONCILIADA` | 3 |
| `IMPORTE_NO_COINCIDE` | 1 (`FAC-2026-0002`) |
| `PENDIENTE` | 1 (`FAC-2026-0006`, sin pago) |
| **Total** | **5** (de 7: 2 descartadas) |

<figure class="project-detail__media">
  <img src="{{ '/assets/images/conciliacion/conciliacion-batch.png' | relative_url }}" alt="Terminal con mvn spring-boot:run mostrando el resumen final del job: CONCILIADA 3 facturas, IMPORTE_NO_COINCIDE 1, PENDIENTE 1, TOTAL 5 y BUILD SUCCESS" loading="lazy">
  <figcaption>Ejecución real con <code>mvn spring-boot:run</code>: el listener final imprime el mismo reparto que resume la tabla.</figcaption>
</figure>

## 3. Decisiones de diseño

**Dos steps, no uno.** Separar la ingesta de facturas de la conciliación de pagos deja cada responsabilidad en su propio step: si mañana la fuente de facturas cambia de formato, no toco la lógica de conciliación. Y el fault tolerance se configura por step.

**Comparar importes con `BigDecimal`, nunca con `double`.** El dinero no es un número flotante. `compareTo` sobre `BigDecimal` es la única forma correcta de decir "estos importes son iguales".

**Filtrado en el processor, no en el reader.** Devolver `null` desde `ItemProcessor` es el filtro nativo del framework: el reader sigue siendo una lectura pura del CSV, y la validación de negocio vive en una clase testeable sin tocar Spring.

**Fault tolerance con política explícita.** `.skip(FlatFileParseException.class).skipLimit(5)`: una fila corrupta no mata el lote, pero el límite evita que un fichero basura pase por "éxito". Un fallo de base de datos no está en la lista, así que sí detiene el job. Nada se omite en silencio: cada fila que el skip deja fuera la registra un `SkipListener`, y el listener del job anota inicio, fin y —si el job no completa— cada excepción en ERROR.

**Los writers son `@Bean` en `BatchConfig`.** No hay una clase `Writer.java`: `writerFacturas` (INSERT) y `writerPagos` (UPDATE) se declaran donde se ensambla todo el job. Los datos persisten en H2, así que tras ejecutar la tabla `facturas` es inspeccionable y las tablas `BATCH_*` guardan el historial de ejecuciones.

**H2 embebida, cero dependencias externas.** El proyecto corre sin Docker, sin nada: `java -jar` y el job se ejecuta. Usa H2 en fichero (`data/`, gitignore): cada ejecución arranca de cero, pero los datos quedan para poder abrirlos y verlos después. Correcto para un esqueleto que debe arrancar en cualquier portátil; las bases reales llegan al adaptarlo a un entorno.

## 4. El test que lo sostiene

Un test de integración (`ConciliacionBatchIntegrationTest`) lanza el job real contra el CSV de muestra y verifica el resultado con assertions sobre la base:

- El job termina en `COMPLETED`.
- quedan **5 facturas**, repartidas en **3 `CONCILIADA` / 1 `IMPORTE_NO_COINCIDE` / 1 `PENDIENTE`**.

Ese test es el que destapó el bug más interesante del proyecto (la ambigüedad `RowCallbackHandler`/`ResultSetExtractor` en `JdbcTemplate`); está contado paso a paso en [Errores al adaptar un batch](/errores/conciliacion-batch/).

## 5. Qué le falta y cómo lo adaptaría

- **La ruta de los CSV está fijada en el classpath.** La haría configurable (`@Value("${ruta-entrada:classpath:facturas.csv}")`) para apuntar a ficheros reales sin recompilar.
- **H2 en fichero** es suficiente para la demo, pero para uso real migraría a PostgreSQL con `docker compose` (concurrencia, volumen, copias).
- **Consulta por factura en `stepPagos`.** Ahora hace un `SELECT` por pago; con volumen real cambiaría a un *batch read* (cargar las facturas relevantes de golpe) para no hacer N viajes a la base.
- **Sin programación de ejecuciones.** Un conciliador real no se lanza a mano: añadiría un calendario (Spring Scheduler o un orquestador externo).

## 6. Cómo ejecutarlo

```bash
git clone https://github.com/JCRodriguez93/conciliacion-batch.git && cd conciliacion-batch
mvn -DskipTests package
java -jar target/conciliacion-batch-1.0.0-SNAPSHOT.jar   # requiere Java 17+

# o solo el test de integración
mvn test
```

No hay servidor web: el proceso arranca, ejecuta el job al arrancar y termina solo. En el log se ven el inicio y el fin del job, los descartes de facturas inválidas, la comparación de cada pago, las filas omitidas por el fault tolerance y el resumen final por estado. Los datos quedan en `data/conciliacion.mv.db`, así que puedes abrirlos después y comprobar que las 5 facturas tienen su estado.

## 7. Resultados y aprendizajes

**Lo que me llevo de adaptar el batch de ejemplo a un caso real:**

- El patrón de Spring Batch (reader-procesador-writer + fault tolerance) sobrevive al cambio de dominio sin tocarlo: cambiar de "empleados" a "facturas y pagos" fue escribir dos modelos y dos procesadores.
- Lo difícil no es el batch, es el build y el ecosistema alrededor: al adaptar encontré dos bugs de mi propia fábrica ([Scafftrix](/proyectos/scafftrix/)) que se habrían repetido en cada generación —faltaba `spring-boot-starter-batch-jdbc` y el *resource filtering* horneaba `scafftrix` en los `application.*` de las plantillas—, y algún error mío (la ambigüedad `RowCallbackHandler`/`ResultSetExtractor`). Todo contado en el [post-mortem](/errores/conciliacion-batch/).
- Un test de integración que lance el job de punta a punta es lo que convierte "lo ejecuté una vez" en "lo puedo romper sin miedo". Fue el test el que encontró el bug que la ejecución manual no mostraba.
