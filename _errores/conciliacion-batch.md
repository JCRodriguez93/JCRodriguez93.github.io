---
title: "Errores al adaptar un batch de ejemplo"
resumen: "Lo que se rompió al pasar del template de empleados a una conciliación real"
proyecto: conciliacion-batch
---

Adapté el proyecto que genera mi fábrica [Scafftrix](/proyectos/scafftrix/) —un job de importación de empleados CSV— a un caso de negocio real: [conciliación de facturas contra pagos](/proyectos/conciliacion-batch/). El camino no fue limpio, y lo interesante es **dónde** se rompió: parte fue error mío al adaptar, y parte resultó ser un bug de mi propia fábrica que se habría repetido en **cada** generación. Aquí lo dejo todo, en el orden en que lo encontré.

Escribo esto porque un portfolio donde todo sale a la primera huele a mentira. Y porque encontrar un bug en tu propia herramienta dice más de cómo trabajas que usarla en modo feliz.

---

## La parte buena: el esqueleto de batch aguantó

Antes de los errores, el dato justo: el patrón de Spring Batch que genera Scafftrix (reader → processor → writer, fault tolerance con `.skip(...).skipLimit(5)`, job repository) **sobrevivió el cambio de dominio sin tocarlo**. Pasar de "empleados" a "facturas y pagos" fue escribir dos modelos y dos procesadores. El código Java de la plantilla compilaba y era correcto para Spring Batch 6: imports en sus paquetes nuevos, listener con `RowMapper` sin ambigüedad.

Los problemas no estaban ahí. Estaban en el **pom** de la plantilla y en mi propio código de adaptación.

---

## Los bugs de la fábrica (se repetían en cada generación)

### Bug 1: faltaba `spring-boot-starter-batch-jdbc`

**Síntoma:** el job corría y terminaba `COMPLETED`, pero no había historial de ejecuciones, no había tablas `BATCH_*`, y re-lanzar el job no tenía memoria de nada.

**Causa:** en Spring Boot 4, el soporte JDBC del JobRepository se **separó** a un starter propio. La plantilla solo incluía:

```xml
spring-boot-starter-batch   <!-- solo el core -->
spring-boot-starter-jdbc    <!-- solo el DataSource -->
```

Sin `spring-boot-starter-batch-jdbc`, Boot monta un `ResourcelessJobRepository` (en memoria, sin persistencia) y la propiedad `spring.batch.jdbc.initialize-schema=always` que escribíamos en la plantilla era **configuración muerta**: esa propiedad vive en el módulo que faltaba.

**Fix:** sustituir el starter en la plantilla:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-batch-jdbc</artifactId>
</dependency>
```

**Verificación:** tras el fix, el proyecto generado crea las 6 tablas `BATCH_*`, registra cada ejecución en `BATCH_JOB_EXECUTION` y el `RunIdIncrementer` incrementa de verdad (`run.id=1`, luego `run.id=2`).

### Bug 2: Spring Boot "horneaba" `scafftrix` en los `application.*` de las plantillas

Este lo encontré de rebote, mirando el `target/classes` de Scafftrix tras compilarlo.

**Síntoma:** en la plantilla empaquetada, los ficheros `application.properties`/`application.yml` tenían `spring.application.name=scafftrix` en lugar del token `@artifactId@`. El `pom.xml` de la misma plantilla, en cambio, conservaba `@artifactId@` intacto.

**Causa:** el parent de Spring Boot habilita *resource filtering* sobre `application*.{yml,properties}` con el delimitador `@`. Al compilar Scafftrix, Maven reescribía `@artifactId@` → `scafftrix` (el artifactId de Scafftrix) **dentro de los `application.*` de cada plantilla**. Pero el generador (`TemplateProjectGenerator.render()`) sustituye `@(\w+)@` en tiempo de generación: si el fichero ya no tiene el token, no hay nada que sustituir, y **todo proyecto generado saldría con `spring.application.name=scafftrix`**, dieras el nombre que dieras.

**Por qué no lo vi antes:** el proyecto de conciliación salió bien porque lo generé en su día desde el IDE, que no aplica ese filtrado igual que el build de Maven del jar empaquetado. El bug solo aparece cuando Scafftrix corre desde su jar construido con `mvn package`.

**Fix:** desactivar el filtrado en el pom de Scafftrix (sus recursos propios no usan tokens, así que es seguro):

```xml
<resources>
    <resource>
        <directory>src/main/resources</directory>
        <filtering>false</filtering>
    </resource>
</resources>
```

**Verificación:** tras `mvn clean package`, los `application.*` de las plantillas vuelven a `@artifactId@`, y el generador los renderiza correctamente.

**Lección:** una fábrica de software no es solo el código que genera, sino el build que la empaquetaba. Un token que sobrevive en `src` puede morir en `target` sin que nadie lo vea, y el bug solo salta al desplegar. Añadí un `.gitignore` limpio y pasé a inspeccionar `target/classes` como parte de revisar un cambio en la plantilla.

---

## Los bugs míos (al adaptar el dominio)

### Bug 3: `RowCallbackHandler` vs `ResultSetExtractor` en `JdbcTemplate`

El más instructivo, y enteramente mío: el listener de la plantilla estaba bien, pero al reescribirlo para agregar facturas por estado escribí esto:

```java
jdbcTemplate.query(sql, rs -> {
    while (rs.next()) {          // ← WRONG
        mapa.put(rs.getString("estado"), rs.getLong("total"));
    }
});
```

Ese lambda es `void`, así que Java lo resuelve como `RowCallbackHandler` — la interfaz a la que **Spring ya le avanza el `ResultSet` fila a fila**. Mi `while (rs.next())` consumía el resto de filas en la primera llamada y la primera fila (`CONCILIADA`, la primera alfabéticamente) nunca se procesaba. El `GROUP BY` en bruto devolvía 3 grupos; `JdbcTemplate` devolvía 2.

Lo confirmó el compilador cuando lo simplifiqué: `reference to query is ambiguous: ResultSetExtractor vs RowCallbackHandler`. El mismo lambda `void` que me hacía perder la fila era, literalmente, ambiguo.

**Fix:** ser explícito con `ResultSetExtractor` (que sí itero yo):

```java
Map<String, Long> porEstado = jdbcTemplate.query(sql,
        (ResultSetExtractor<Map<String, Long>>) rs -> {
            Map<String, Long> mapa = new HashMap<>();
            while (rs.next()) {
                mapa.put(rs.getString("estado"), rs.getLong("total"));
            }
            return mapa;
        });
```

| Interfaz | Quién itera | `rs.next()` |
|---|---|---|
| `RowCallbackHandler` | Spring | Nunca |
| `ResultSetExtractor` | Tú | Sí, con `while` |
| `RowMapper` | Spring | Nunca |

### Bug 4 y compañía: distracciones

- **Culpé a H2 sin mirar.** El test fallaba leyendo la base y mi instinto fue culpar la versión, el usuario `sa`, la contraseña. Llegué a fijar `h2` a mano. Nada de eso arregló nada: los datos estaban bien (lo comprobé con un `Statement` crudo), el problema era el `JdbcTemplate` de arriba. La lección: aislar y demostrar antes de tocar configuración.
- **El job corría dos veces en el test.** `JobLauncherApplicationRunner` lo arrancaba al subir el contexto. Solución: `spring.batch.job.enabled=false` solo en test.
- **Commiteé `target/`** en el primer push. Un `.gitignore` no se improvisa en el commit dos.

---

## Qué cambié y cómo lo verifiqué

| Cambio | Dónde | Verificación |
|---|---|---|
| `spring-boot-starter-batch-jdbc` | plantilla + proyecto | 6 tablas `BATCH_*`, historial de ejecuciones, `run.id` incremental |
| Desactivar resource filtering | pom de Scafftrix | `application.*` de plantilla conservan `@artifactId@` tras `clean` |
| `ResultSetExtractor` explícito | listener + test | test en verde dos veces seguidas; ejecución real `COMPLETED` |
| H2 en fichero (`data/`, gitignored) | proyecto | tras `java -jar`, la tabla `facturas` es inspeccionable: 5 filas con sus estados |

El resultado final, verificado con test y en ejecución real: **5 facturas** (3 `CONCILIADA`, 1 `IMPORTE_NO_COINCIDE`, 1 `PENDIENTE`), datos persistidos en H2 y metadatos del job en `BATCH_*`.

Lo que me llevo: usar tu propia fábrica en modo feliz es fácil; lo que demuestra criterio es seguirla mirando cuando genera algo y preguntarte si el build, y no solo el código, hace lo que crees que hace.

**El proyecto, ya en verde:** [ver conciliacion-batch →](/proyectos/conciliacion-batch/)
