---
title: "Errores al empaquetar y entregar lo que mi fábrica genera"
resumen: "Un README que mentía sobre su propia versión de Spring Boot y un ZIP cuya raíz era 'source/' en lugar del nombre del proyecto"
proyecto: scafftrix
---

Mi fábrica [Scafftrix](/proyectos/scafftrix/) genera proyectos y los entrega en un ZIP. Hasta ahora solo había mirado **lo que genera** (código, tests, compila); estas dos veces miré **lo que empaqueta y entrega**, y ahí estaban los fallos. Los dos bugs habrían salido en **cada** microservicio generado.

Escribo esto por lo mismo que escribí el [post-mortem de conciliacion-batch](/errores/conciliacion-batch/): ya van **cinco** defectos encontrados (cuatro de fábrica, uno de mi repositorio), y ninguno apareció usando el portal en modo feliz, sino inspeccionando su salida.

---

## Bug 3: el README del microservicio mintía sobre su propia versión de Spring Boot

**Síntoma:** todo microservicio salía con `pom.xml` correcto (la versión elegida, `4.1.1` por defecto) pero con un `README.md` que decía:

```markdown
- Java 17 y Spring Boot 3.4.x
```

El proyecto mentía sobre sí mismo en su primera página de documentación.

**Causa:** en la plantilla, el `pom.xml` usa el token `@springBootVersion@` y el `README.md` tenía la versión escrita **a mano**. El usuario elige versión de una lista blanca, el pom la respeta, el README no se entera.

**Fix:** el mismo token en el `README.md` de la plantilla (`project-microservice-template/README.md:9`):

```markdown
- Java 17 y Spring Boot @springBootVersion@
```

**Verificación:** generé un proyecto nuevo con la versión 4.1.1 y el README resultante dice `- Java 17 y Spring Boot 4.1.1`.

**Lección:** cuando una plantilla tiene tokens, **todos** los ficheros de la plantilla tienen que hablar el mismo idioma. Un fichero hardcodeado no falla al compilar, no falla en test, no falla en nada: solo miente. La comprobación es leer la salida, no el código fuente de la plantilla.

---

## Bug 4: el ZIP entregaba la raíz `source/` en lugar del proyecto

Este es el que me obligó a reestructurar los dos repos que ya tenía publicados.

**Síntoma:** descargaba el ZIP de cualquier proyecto, lo extraía, y me aparecía esto:

```
notificaciones-ms/
└── source/          ← carpeta que no pide nadie
    ├── README.md    ← el README real, enterrado
    ├── pom.xml
    └── src/
```

Consecuencias: el `README.md` **no se ve en GitHub** (GitHub solo renderiza el de la raíz), y ningún repo de verdad tiene esa estructura. Un recruiter que abra el repositorio ve una carpeta `source` y nada más.

**Causa:** `WorkspaceManager.compress()`, que es quien construye el ZIP:

```java
Path rootFolder = sourceDirectory.getFileName();          // → "source"
...
String entryName = rootFolder + "/" + relative...;         // WorkspaceManager.java:168
```

Usa el nombre del directorio interno de trabajo (`source`) como carpeta raíz del ZIP. Pero el **javadoc justo encima** de ese método dice otra cosa:

> *The ZIP always contains a single top-level folder **named after the artifact id*** (`WorkspaceManager.java:139`)

Es decir: el código contradecía su propia documentación. El `artifactId` ya venía como parámetro del método y ya se usaba para nombrar el fichero `.zip`, solo no se usaba para nombrar la carpeta.

**Por qué no salió antes:** porque lo cubría el test. `WorkspaceManagerTest` tenía un test que verificaba que la carpeta raíz existiera… y fijaba explícitamente que se llamara `source`:

```java
assertThat(names).contains(source.getFileName() + "/pom.xml", ...);
```

El test asentaba el comportamiento en lugar de la intención. Todo en verde, bug intacto.

**Fix (una línea + su test):**

```java
String rootFolder = artifactId;   // WorkspaceManager.java:156
```

Y el test pasa a verificar lo que dice el contrato, no lo que hacía el código:

```java
void compressesASourceTreeIntoAZipRootedAtTheArtifactId() {
    ...
    assertThat(names).contains("customer-management/pom.xml", ...);
    assertThat(names).allMatch(name -> name.startsWith("customer-management/"));
    assertThat(names).noneMatch(name -> name.startsWith("source/"));
}
```

**Verificación:**

| Paso | Resultado |
|---|---|
| `mvn test` | **228 tests, 0 fallos, BUILD SUCCESS** |
| `docker compose build` + `up -d` | contenedor `healthy`, `/actuator/health` = `UP` |
| Generar proyecto `zip-root-check` y descargar el ZIP | raíz única **`zip-root-check/`**, **0 entradas bajo `source/`** |

Antes / después del ZIP:

```
antes:  source/README.md, source/pom.xml, source/src/...
ahora:  zip-root-check/README.md, zip-root-check/pom.xml, zip-root-check/src/...
```

---

## La parte que dolió: reestructurar los dos repos publicados

El bug ya estaba dentro de `notificaciones-ms` y `conciliacion-batch`: los dos tenían el código enterrado en `source/` y el README fuera de la raíz. Arreglar Scafftrix no arreglaba los repos.

Los reestructuré con `git mv` para que el historial sobreviviera, y comprobé el diff antes de tocar el remoto:

| Repo | Renombres | Cambios que no son rename | `target/` y `data/` en el commit |
|---|---|---|---|
| `notificaciones-ms` | 35 (100% similitud) | 0 | no |
| `conciliacion-batch` | 14 (100% similitud) | 0 | no |

0 inserciones y 0 borrados: **solo cambiaron rutas, ni un byte de contenido**. Cada repo quedó con un único `.gitignore` y un único `README.md`, ambos en la raíz.

Un detalle que aclaro porque lo dudé: **Scafftrix no genera ningún `.gitignore`** (lo comprobé con un grep sobre todo su código fuente y sobre las plantillas). Los `.gitignore` de los dos repos los escribí yo a mano; cada proyecto tenía exactamente uno, no había duplicados — el problema era otro: estaban en la raíz del repo mientras el proyecto vivía dentro de `source/`.

---

## De rebote: el `.gitignore` se había comido `WorkspaceManager.java`

Este no afecta a los proyectos generados, pero lo encontré justo al intentar commitear el fix de arriba y no podía dejarlo fuera.

**Síntoma:** aplico el fix, compruebo el fichero en disco (correcto) y ejecuto `git status`… **no aparece**. El fichero modificado no figuraba como modificado, como si nadie lo vigilara.

**Causa:** el `.gitignore` de Scafftrix guardaba los datos en tiempo de ejecución con patrones **sin anclar a la raíz**:

```
# Datos H2
data
workspace
```

En git, un patrón sin barra ni `*` **no distingue profundidad**: `workspace` ignora cualquier carpeta llamada `workspace`, en cualquier nivel del árbol. Y resulta que el paquete Java de esa clase es justo `.../factory/workspace/`. Consecuencia verificada:

```
$ git ls-files --others --ignored --exclude-standard -- src/
src/main/java/es/scafftrix/factory/workspace/WorkspaceManager.java
src/test/java/es/scafftrix/factory/workspace/WorkspaceManagerTest.java

$ git show HEAD:src/main/java/.../WorkspaceManager.java
(empty)
```

Es decir: **`WorkspaceManager.java` —la clase dueña de cada ruta del sistema de ficheros y de construir el ZIP— nunca se había commiteado**. El repo no contenía una pieza central de su propio código. Mi fix habría quedado fuera del commit sin que git dijera una sola palabra de advertencia.

**Por qué nadie lo notó:** porque el fichero estaba en disco y todo compilaba en local. El daño solo aparece en el momento en que alguien clona el repo desde cero.

**Fix:** anclar los patrones de datos a la raíz:

```
/logs
/data
/workspace
```

`target` sigue sin anclar a propósito (los submódulos de Maven sí deben ignorar su `target/`), mientras que `logs`, `data` y `workspace` son rutas de ejecución que solo existen en la raíz.

**Verificación:**

| Comprobación | Resultado |
|---|---|
| `git ls-files --others --ignored --exclude-standard -- src/` | vacío (0 ignorados) |
| `git status` | los 2 ficheros aparecen como `??` trackeables |
| `git check-ignore workspace data` (creados a mano) | siguen ignorados en la raíz ✓ |

**Lección:** `.gitignore` es código que decide **qué parte de tu proyecto existe para git**. Un patrón cómodo para los datos de ejecución puede estar borrando en silencio una capa entera de tu fuente, y la única señal es que `git status` no te enseña lo que esperas ver. Revisarlo con `git check-ignore -v` y con `git ls-files --others --ignored` pasó a formar parte de comprobar cualquier cambio de estructura.

---

## Resumen de los bugs encontrados

| # | Bug | Dónde | Verificado con |
|---|---|---|---|
| 1 | Faltaba `spring-boot-starter-batch-jdbc` | plantilla batch | 6 tablas `BATCH_*`, `run.id` incremental |
| 2 | Maven horneaba `scafftrix` en los `application.*` | pom de Scafftrix | `clean package` + leer `target/classes` |
| 3 | README con Spring Boot `3.4.x` hardcodeado | plantilla microservicio | proyecto generado con README `4.1.1` |
| 4 | ZIP con raíz `source/` | `WorkspaceManager` | 228 tests + ZIP descargado sin `source/` |
| 5 | `.gitignore` sin anclar borraba `WorkspaceManager.java` del repo | `.gitignore` de Scafftrix | `git ls-files --ignored` + `git check-ignore -v` |

Los cinco tenen la misma forma: **la fábrica funcionaba y su salida parecía correcta**; se rompían en el borde —el build que la empaquetaba, el README que entregaba, el ZIP que comprimía, el git que lo guardaba—. Nivel de código, correcto. Nivel de entrega, no.

Los cuatro primeros afectan a lo que Scafftrix genera o entrega; el quinto es de mi propio repositorio, y por eso tardó más: git no protesta cuando ignora algo, simplemente te lo omite.

Lo que me llevo: la única forma barata de encontrar esta clase de fallos es **inspeccionar sistemáticamente lo que tu herramienta entrega** —el ZIP, el README, el listado de lo que git trackea—, no solo lo que compila. Un test que comprueba que "hay una carpeta raíz" no te protege; uno que comprueba **cómo se llama** esa carpeta, sí.

**Los dos repos, ya con el árbol estándar y en GitHub:** [notificaciones-ms](https://github.com/JCRodriguez93/notificaciones-ms) · [conciliacion-batch](https://github.com/JCRodriguez93/conciliacion-batch)
