---
layout: page
title: Mi metodología
subtitle: "Cómo trabajo: el proceso que sigo desde un caso de práctica hasta un proyecto Spring Boot terminado"
permalink: /metodologia/
---

Mi experiencia profesional se reduce a dos estancias cortas —programación COBOL en ViewNext y un programa de formación en microservicios y batch en Minsait—, donde aprendí el "cómo se hace" en un equipo real. A partir de ahí he seguido por mi cuenta, de modo que todos los proyectos de este portfolio los he creado yo: busqué problemas habituales que se dan mucho en el mundo real —controlar un almacén que vive en un Excel, conciliar un fichero que llega de madrugada, que un sistema avise a otro—, me los planteé como si fueran un encargo y los resolví con el mismo rigor que aplicaría en uno de verdad. Lo que explico aquí es ese proceso, paso a paso, con el lenguaje con el que se lo contaría a un compañero recién salido de DAM o DAW.

## El punto de partida: me planteo un caso

Al elegir un caso para practicar, lo encajo en el molde de un encargo real. Los que he usado: *"necesitamos controlar el stock de un almacén que hoy está en Excel"*, *"cada noche llega un CSV con movimientos que hay que conciliar contra la base de datos"*, *"el sistema de reservas tiene que avisar al sistema de facturación"*.

Antes de abrir el IDE me hago las preguntas de siempre:

1. **¿Qué problema concreto resuelve?** Si no puedo explicarlo en una frase, el caso aún no está listo para empezar.
2. **¿Qué tipo de proceso es?** ¿Una web con usuarios? ¿Un trabajo que corre de madrugada sobre ficheros? ¿Dos sistemas que se hablan por API? De aquí sale el perfil del proyecto (hay una tabla más abajo).
3. **¿Quién consume la interfaz y en qué formato?** Entre sistemas, REST + JSON. En un fichero de entrada, columnas, separador y codificación. De aquí sale el contrato.
4. **¿Qué datos se persisten, cuánto volumen hay y cuál es la fuente de verdad?** De aquí sale el motor de datos; para arrancar, casi siempre H2 en memoria, que no instala nada.
5. **¿Cómo se arranca y quién lo ejecuta?** ¿JAR? ¿Docker? ¿Una vez al día?
6. **¿Qué es "que funcione"?** Lo dejo escrito: reglas de negocio correctas, logs para poder diagnosticar un fallo, tests que protejan esas reglas y un README que permita arrancar el proyecto sin llamarme.

El resultado es un párrafo de alcance: esto hace, esto no hace, esta es su interfaz. Quien encarga un proyecto lo aprueba antes de que se escriba código; en mi caso lo firmo yo conmigo y no toco el IDE hasta tenerlo.

## El flujo común: 8 pasos

1. **Concretar el alcance.** Las respuestas de arriba convertidas en párrafo más lista de lo que queda fuera.
2. **Contrato antes que código.** Escribo la interfaz primero: en REST, un contrato OpenAPI (`api.yaml`) con endpoints, cuerpos de respuesta y ejemplos reales; en batch, la definición del fichero de entrada, incluido qué pasa con una fila inválida. Si al implementar algo no encaja, se cambia el contrato antes que el código: arreglar un problema de diseño en el contrato sale mucho más barato que en la implementación. Es el enfoque *contract-first* del que hablo en [Sobre mí]({{ '/sobre-mi/' | relative_url }}). También he de añadir a título personal que la parte del contrato es la que más tediosa me parece, supongo que en parte con mi guerra personal con la indentación.
3. **Generar el esqueleto con [Scafftrix](/proyectos/scafftrix/).** En lugar de empezar de cero o copiar un tutorial de internet, uso mi fábrica de plantillas: elijo perfil (monolito, batch, microservicio), relleno nombre, paquete y versión de Spring Boot, y descargo un ZIP que ya trae estructura de paquetes, `pom.xml`, configuración por perfil, logging (consola + `logs/app.log` en JSON), `.gitignore` y un primer test verde.
4. **Adaptar las clases al problema.** Sustituyo el dominio de ejemplo de la plantilla por el real: entidades, servicios, controladores, manejador de errores. Renombro, borro lo que sobra y comparo contra el contrato del paso 2; si el código y el contrato discuten, gana el contrato.
5. **Montar los datos.** Primero H2 en memoria: no instala nada, arranca en un segundo y da para probar el caso feliz sin fricción. Cuando el proyecto ya funciona y quiero acercarlo más a lo real, paso a un motor de verdad —MySQL o PostgreSQL— con `docker-compose` y un sembrador de datos de ejemplo. Mis proyectos conviven así: desarrollo y tests sobre H2, y el compose llega después para verificar contra el motor real.
6. **Logging desde el primer servicio.** Un logger por clase y criterios fijos: **INFO** para lo que pasa (altas, trabajos terminados), **DEBUG** para el detalle que solo necesito yo, **WARN/ERROR** para algo que otro tendrá que investigar más tarde. Los errores de negocio se registran con contexto —qué registro, qué entrada—; el stack trace no debe ser la única pista.
7. **Tests.** Unitarios de las reglas de negocio, `MockMvc` para la interfaz y al menos una integración que arranque el contexto real. La meta es concreta: si cambio una regla, que lo diga un test antes que una persona. En la consultora donde tuve mi primer contacto aprendí JUnit 5 y Mockito, y me quedó grabado que un JAR solo se entregaba si la cobertura de tests llegaba al 80%; no llegué a vivirlo en primera persona, y me suena que ese umbral venía de un quality gate de SonarQube —por cierto, mirando la documentación ahora mismo, no va descaminado: el gate que SonarQube trae por defecto exige exactamente un 80% de cobertura sobre el código nuevo.
8. **Verificación y entrega.** `mvn clean verify` en verde, arranque real probando el caso feliz y uno de error, comprobar que los logs salen como esperaba, README con el que se arranca en tres comandos, y commits pequeños cuyo mensaje explique el porqué.

## ¿Qué perfil elijo según el caso?

| Si el caso suena a… | Perfil | Qué cambia |
|---|---|---|
| Una web que gestiona algo, todo en una pieza | **Monolito Spring Boot** | [Guía ↓](#monolito-spring-boot) |
| Lo mismo, pero con varias áreas que crecerán por separado | **Monolito modular** | [Guía ↓](#monolito-modular) |
| Un trabajo por lotes sobre ficheros o datos | **Proceso batch (Spring Batch)** | [Guía ↓](#proceso-batch) |
| Varios sistemas que se hablan por API | **Microservicio contract-first** | [Guía ↓](#microservicio-contract-first) |

La elección sale de la pregunta 2. Un CSV que llega de madrugada no necesita usuarios ni sesiones, y una web con formulario no necesita un `ItemReader`.

## Monolito Spring Boot

> Caso que me planteé: dejar el control de un almacén en una web interna con su base de datos.

- **Pasos 1-2:** alcance y contrato con los endpoints REST (`GET /referencias`, `POST /movimientos`...) y sus errores.
- **Paso 3:** Scafftrix con perfil `SPRING_BOOT`: la web, el contrato incluido en `src/main/resources/contract/` y la estructura de capas.
- **Paso 4 (lo que más pesa):** el controlador recibe y responde, el servicio piensa —las reglas de negocio viven ahí—, el repositorio solo habla con la base de datos. Las excepciones del dominio las traduce un manejador global (`@RestControllerAdvice`) a los errores definidos en el contrato, en lugar de un `500` crudo.
- **Paso 5:** los tests y el desarrollo arrancan sobre H2 en memoria, con un sembrador de datos de ejemplo; el paso de realismo es después, con el `docker-compose` de MySQL.
- **Paso 6:** `INFO` en altas y operaciones relevantes, `DEBUG` en las consultas, todo con `logs/app.log` en JSON.
- **Paso 7:** un test unitario por servicio, una integración que arranque el contexto real y el manejador de errores probado con `MockMvc`.
- **Paso 8:** `mvn clean verify`, arranque real con el sembrador.

Proyecto ejemplo: **[inventario-api](/proyectos/inventario-api/)** — las tres capas, el manejador con su cuerpo `ApiError` del contrato y MySQL con compose.

## Monolito modular

Mismo flujo y mismo perfil de Scafftrix que el monolito; la diferencia está en el diseño del dominio. Lo corto por áreas desde el principio: cada módulo (inventario, alertas, movimientos...) con sus servicios, entidades y tests, exponiendo su API pública. Un módulo no se mete por las clases internas de otro: si necesita algo suyo, lo pide por esa interfaz en lugar de tocar sus tablas. Eligo este perfil cuando el caso ya da señales de que tendrá varias áreas y quiero tocar una sin miedo a romper otra, sin pagar todavía el coste de separar todo en servicios independientes, aunque también he de decir que es el siguiente paso natural para proyectos que acaban creciendo demasiado y yendose de las manos, empiezo con monolitos y termino modularizando la app.

## Proceso batch

> Caso que me planteé: cada noche llega un CSV de 100.000 filas con movimientos que hay que conciliar contra la base de datos.

- **El contrato, aquí, es el fichero:** columnas, separador, codificación y qué pasa con una fila inválida. Se cierra antes de programar.
- **Paso 3:** Scafftrix con perfil `SPRING_BATCH`: un `Job` con su `Step` y el ciclo leer → procesar → escribir por chunks, con el `JobRepository` y sus tablas `BATCH_*` listos.
- **Paso 4:** mi lector para el formato real, mi procesador con las reglas de conciliación y mi escritor contra mi base de datos.
- **Errores:** una fila mala no puede tumbar el trabajo de toda la noche: se omite con un `SkipListener`, se deja constancia en el log con su motivo y por la mañana se revisa lo omitido.
- **Paso 6:** inicio y fin del job, contadores (leídos, procesados, omitidos) y cada omisión con su motivo. Sin esos contadores, un batch nocturno es una caja negra.
- **Paso 7:** test unitario de la transformación, que es donde viven los fallos, más una integración con un fichero de ejemplo pequeño en `src/test/resources` que hace correr el job entero sin tocar datos reales.

Proyecto ejemplo: **[conciliacion-batch](/proyectos/conciliacion-batch/)** — reader de CSV, conciliación por lote y el `SkipListener` que deja rastro en el log en lugar de parar el trabajo.

## Microservicio contract-first

> Caso que me planteé: un sistema necesita avisar a otro cuando ocurre un evento.

- **Paso 2:** el contrato es la pieza más delicada: un `api.yaml` con endpoints, modelos, errores y ejemplos. Trabajo contra él; si algo no tiene sentido al implementarlo, se cambia el contrato y se avisa, en lugar de añadir un campo por el camino que el consumidor no espera.
- **Paso 3:** Scafftrix con perfil `SPRING_MICROSERVICE`: layout **hexagonal** (carpetas por intención: `domain` con el corazón sin dependencias de nada, `application` con los casos de uso, `infrastructure` con los adaptadores —BD, APIs externas— y `api` con lo que se expone por HTTP), migraciones **Flyway** y **Swagger UI** (springdoc) generado a partir del propio contrato. El perfil trae además `docker-compose` con PostgreSQL para levantar el motor real cuando toque; mientras tanto, desarrollo y tests van sobre H2.
- **Paso 6:** registro de cada ciclo —entrada, decisión, resultado— y errores tipados, para que quien reciba la respuesta sepa qué clase de fallo es.
- **Paso 7:** test unitario de dominio sin arrancar nada, controlador con `MockMvc` y comprobación de que la implementación cumple el contrato.

Proyecto ejemplo: **[notificaciones-ms](/proyectos/notificaciones/)** — contrato OpenAPI, layout hexagonal y el ciclo completo de un evento hasta registrar su envío.

## La verificación final

- `mvn clean verify` en verde.
- Arranque real: caso feliz y un caso de error probados a mano.
- Reviso los logs: ¿diagnosticaría este fallo alguien que no es yo? ¿Sale el `app.log` en JSON?
- README que permita arrancar sin leer el código.
- Commits pequeños y mensajes que expliquen el porqué.

Cuando algo se rompe —y se rompe—, lo documento: cada incidente serio de mis proyectos está contado en [Errores y post-mortems](/errores/).

**[Ver los proyectos que salen de este flujo →](/#proyectos)** · **[¿Hablamos? →]({{ '/contacto/' | relative_url }})**
