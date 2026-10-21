# Portfolio personal — Jorge Campos Rodríguez

Web estática con [Jekyll](https://jekyllrb.com/) sin temas externos: todo el CSS está escrito a mano en SCSS (`assets/css/style.scss`). El sitio recoge mis proyectos, los post-mortems de los errores que encontré en ellos, mi formación y un canal de contacto.

## Ejecutar en local

Requisitos: Ruby 3.x o superior y Bundler (`gem install bundler`).

```bash
bundle install
bundle exec jekyll serve
```

Abrir <http://localhost:4000>.

## Estructura

```
_config.yml          # configuración y colecciones (projects + errores)
_data/navigation.yml # menú del header
_includes/           # plantillas parciales (head, header, footer, project-card)
_layouts/            # layouts: default, page, project, error
assets/css/style.scss# tema completo (oscuro, sin frameworks)
_projects/           # proyectos
_errores/            # post-mortems, uno por proyecto
index.md             # landing
errores.md           # índice de post-mortems
sobre-mi.md          # /sobre-mi/
formacion.md         # /formacion/
metodologia.md       # /metodologia/
contacto.md          # /contacto/
```

Cada proyecto y cada post-mortem se define una sola vez en su fichero de la colección (título, stack, repo, resumen…); la landing, la página de detalle y el índice se generan automáticamente a partir de ahí.

## Publicación

El sitio se publica con GitHub Pages: hacer push a `main` y Pages recompila (Settings → Pages → Deploy from a branch → `main` / carpeta `/ (root)`).

## Contacto

- Email: [jorgecampos_open2work@protonmail.com](mailto:jorgecampos_open2work@protonmail.com)
- LinkedIn y GitHub: enlaces en el sitio.
