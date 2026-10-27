---
name: sdd-spec
description: En este repo no se escriben specs. Redirige a core-bancario, donde vive la única fuente de verdad de las specs.
argument-hint: '[descripción breve de la feature]'
disable-model-invocation: true
---

# La fase Spec no se hace en este repositorio

No crees ningún archivo ni carpeta. Dile al autor, con estas ideas y en pocas líneas:

- Las specs viven **solo** en `core-bancario`, aunque la feature sea solo de frontend: así hay una sola fuente de verdad, una sola numeración de features y de ADRs, y una spec puede ordenar también el cambio de la API que la pantalla necesite.
- **Dónde seguir:** abrir Claude en `core-bancario` (`C:\Users\miguel\source\repos\core-bancario`) y ejecutar allí `/sdd-spec $ARGUMENTS`.
- Cuando el plan esté aprobado, las tareas con `Repo: core-bancario-web` se construyen aquí con `/sdd-build NNN-slug`.
