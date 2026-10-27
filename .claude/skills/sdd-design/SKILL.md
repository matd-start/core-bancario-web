---
name: sdd-design
description: En este repo no se diseña. Redirige a core-bancario, donde viven el plan, las tareas y las ADRs.
argument-hint: '[NNN-slug]'
disable-model-invocation: true
---

# La fase Design no se hace en este repositorio

No crees ningún archivo ni carpeta. Dile al autor, con estas ideas y en pocas líneas:

- El plan, las tareas y las ADRs viven **solo** en `core-bancario`. El planner de allí diseña los dos repos a la vez y marca cada tarea con su `Repo:`.
- **Dónde seguir:** abrir Claude en `core-bancario` (`C:\Users\miguel\source\repos\core-bancario`) y ejecutar allí `/sdd-design $ARGUMENTS`.
- Cuando el plan esté aprobado, las tareas con `Repo: core-bancario-web` se construyen aquí con `/sdd-build $ARGUMENTS`.
