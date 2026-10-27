# Bitácora de construcción

Una carpeta por feature, con el mismo nombre que en `core-bancario/specs/` (por ejemplo, `004-front-base/`).

Aquí **no** hay specs ni planes: esas decisiones viven solo en `core-bancario` (spec, plan, tareas y ADRs). Esta carpeta guarda la evidencia de lo que se construyó en este repositorio:

| Archivo       | Quién lo escribe | Qué es                                                                                              |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `avance.md`   | `coder`          | Las tareas de este repo que se terminaron, con su ID y su título (`- [x] T12 — Contratos y tipos`). |
| `learning.md` | `coder`          | Explicación de lo construido para quien ve estos patrones por primera vez.                          |
| `review.md`   | `/sdd-review`    | Veredicto del `reviewer` sobre el PR, sin editar.                                                   |

Cuando el PR del web se mergea, las casillas `[x]` se copian a `tasks.md` de `core-bancario` con un commit `docs(NNN)` al empezar el siguiente PR del backend (lo detecta `/sdd-build` de ese repo).
