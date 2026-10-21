---
title: "FishRace — Videojuego 2D arcade"
tipo: "Proyecto fin de ciclo (DAM)"
orden: 6
resumen: "Videojuego arcade 2D del proyecto fin de ciclo de DAM: un pez sobrevive en un océano con tiburones y medallas. Compilado para Windows y Android desde el mismo código."
stack:
  - Unity 6
  - C#
  - Unity 2D Physics
  - Patrón Observer
  - JsonUtility
  - Git
repo: "https://github.com/JCRodriguez93/proyecto-dam-2022"
demo: ""
contrato: ""
media:
  src: "/assets/images/fishrace/fishrace-demo.gif"
  alt: "Demostración de gameplay de FishRace: el pez esquiva tiburones y recoge medallas"
  caption: "Modo de juego: esquiva tiburones y estrellas, recoge medallas y sobrevive el mayor tiempo posible."
---

## 1. El contexto

**FishRace** es mi proyecto de fin de ciclo del grado superior de **Desarrollo de Aplicaciones Multiplataforma (DAM)**, desarrollado entre enero y diciembre de 2022. Fue mi primera inmersión completa en el desarrollo de un producto de software de principio a fin: desde la organización del proyecto y el control de versiones hasta la compilación final para escritorio y móvil.

El desarrollo se apoyó en una formación en vídeo que seguí como guía de aprendizaje; sobre esa base trabajé la integración de los sistemas del juego, el pulido de las mecánicas, la organización del código y, ya en mi etapa como desarrollador, la migración del proyecto a Unity 6 en octubre de 2026.

## 2. Qué construí

Un videojuego arcade 2D donde controlas un pez que debe sobrevivir el mayor tiempo posible: esquiva tiburones y estrellas, recoge medallas (+5 puntos por medalla) y aguanta hasta que se agote tu vida.

Más allá del gameplay, el objetivo real del proyecto como estudiante fue **aplicar de forma conjunta** todos los conceptos del ciclo en un único producto funcionando:

- **Barra de vida** con estado "moribundo": por debajo de 20 de vida el audio se ralentiza (`AudioSource.pitch`) para dar feedback del estado crítico.
- **Generador aleatorio** de enemigos y recogibles cada 5–7 segundos mientras el pez nada.
- **Puntuación y récord** persistente en local: se guarda en `Application.persistentDataPath/registro.json`, ruta válida en Windows, Android y WebGL.
- **Flujo de escenas** con Scene Manager: menú (`PlayScene`) → partida (`GameScene`) → Game Over con puntuación y récord.

## 3. Decisiones y conceptos técnicos aplicados

**Desacoplamiento con patrón Observer.** El proyecto usa un `NotificationCenter` (basado en la Unity Wiki) que funciona como bus de eventos con notificaciones por nombre: `pezVivo`, `personajeMuerto`, `bajarVida`, `pezMoribundo`. Así, sistemas que no deberían conocerse entre sí se comunican sin referencias directas: el generador de enemigos se detiene cuando el pez muere **sin tener ninguna referencia al pez**, y la barra de vida emite eventos que consumen el audio y el HUD.

**Estado persistente entre escenas.** El récord se mantiene con un singleton (`Estado`) protegido con `DontDestroyOnLoad` y una guarda contra instancias duplicadas: si al cargar la siguiente escena ya existe una instancia, la nueva se destruye. Patrón clásico para objetos que deben sobrevivir al cambio de escena.

**Física en el ciclo de vida correcto.** La velocidad de nado se fija en `FixedUpdate` (paso de física de Unity, independiente de los FPS) mientras el input se lee en `Update`. Mezclar ambos es una fuente clásica de comportamiento errático, y esta separación fue una de las primeras lecciones del proyecto.

**Input multiplataforma unificado.** Un mismo código atiende dos dispositivos sin duplicar lógica: en escritorio, clic izquierdo sube y clic derecho baja; en móvil, la mitad superior/inferior de la pantalla. La detección automática (`Input.touchSupported`) permite que la misma build de Android funcione en tabletas, y el proyecto compila para **Windows y Android desde el mismo código**.

**Persistencia de datos con serialización JSON.** El récord se guarda con `JsonUtility` (serialización de clases con `[Serializable]`) y `System.IO`, con lectura defensiva: si el fichero no existe se empieza en 0, y si está corrupto el `try/catch` evita que el juego se rompa.

**Dificultad progresiva.** La velocidad de nado crece con el tiempo (incremento por frame), lo que tensa la partida de forma orgánica sin tener que reescribir las mecánicas base.

**Feedback jugable.** El parallax de fondo se implementa desplazando el `mainTextureOffset` del material, y la cámara sigue al pez solo en el eje X (`SeguirPersonaje`), manteniendo la altura fija.

## 4. Estructura del proyecto

18 scripts C# organizados por responsabilidad dentro de la estructura estándar de Unity (`Assets/`: `Animations/`, `Prefabs/`, `Scenes/`, `Scripts/`, `Sounds/`, `Sprites/`...), dos escenas (`PlayScene` y `GameScene`), prefabs reutilizables para personaje, enemigos y UI, y control de versiones con Git (el `.gitignore` de Unity evita subir la carpeta `Library/`).

## 5. Cómo ejecutarlo

- **Requisitos:** Unity `6000.6.4f1` (Unity 6), instalado desde Unity Hub.
- Clonar el repositorio y abrir la carpeta con Unity Hub.
- Ejecutar la escena `Assets/Scenes/PlayScene.unity` (menú con botón Jugar).
- Plataformas con Build Support en el proyecto: **Windows (Standalone)** y **WebGL**; el código soporta además Android/iOS con los módulos de plataforma instalados.

## 6. Mantenimiento y aprendizajes

**Mantenimiento real (2026).** Cuatro años después del desarrollo original, migré el proyecto de Unity 2022 a **Unity 6**, resolviendo los cambios de API de la versión nueva (por ejemplo, `Rigidbody2D.velocity` → `Rigidbody2D.linearVelocity`). Fue un buen ejercicio de leer documentación de migración y actualizar código existente sin romper el comportamiento, algo que haré constantemente en cualquier stack profesional.

**Qué haría diferente hoy:**

- **Testeabilidad:** hoy la lógica vive en clases `MonoBehaviour`, acopladas al motor y difíciles de unit-testear. Separaría la lógica de negocio (vida, puntuación, dificultad) en clases puras de C# y dejaría en los `MonoBehaviour` solo la orquestación; el Unity Test Framework ya viene instalado en el proyecto y no se aprovechó.
- **Eventos tipados:** el bus de notificaciones usa strings, que no son seguros ante refactorings. Hoy usaría un patrón de eventos tipado (o `UnityEvent` serializados con nombres de método verificados en compilación).
- **Balanceo parametrizado:** valores como el daño por tiburón (70) o el crecimiento de velocidad están incrustados en el código; hoy los sacaría a un ScriptableObject de configuración para poder balancear sin tocar scripts.

**Puente con mi perfil actual.** Este proyecto es C#/Unity, no Java, pero las bases que sienta son las que aplico hoy en backend: orientación a objetos, desacoplamiento entre sistemas, persistencia de datos serializados, manejo de errores y flujo de compilación multiobjetivo. El razonamiento central —decidir dónde vive cada responsabilidad y cómo se comunican las piezas— es exactamente el que llevo a Spring Boot.
