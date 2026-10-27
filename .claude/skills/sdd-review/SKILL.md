---
name: sdd-review
description: Fase Analysis del flujo SDD en el repo web. El subagente reviewer compara el PR en curso con la spec y el plan, da un veredicto y cierra con un punto de comprensión antes del pull request.
argument-hint: '[NNN-slug]'
disable-model-invocation: true
---

# Fase Analysis en el web: veredicto

Feature: $ARGUMENTS. Spec, plan y tareas en `../core-bancario/specs/$ARGUMENTS/`; bitácora en `construccion/$ARGUMENTS/`.

## Pasos

1. Identifica el PR en curso: la sección de `tasks.md` cuyas tareas lista `construccion/$ARGUMENTS/avance.md` en esta rama.

2. **Delega al subagente `reviewer`** con el nombre de la feature y el título de esa sección. No le pases tu opinión ni el razonamiento de la fase Build: debe juzgar con contexto limpio.

3. Guarda su respuesta completa, sin editarla, en `construccion/$ARGUMENTS/review.md`. Si ya existe la de un bloque anterior, añade la nueva al principio, separada por `---`.

4. **Si el veredicto es CAMBIOS REQUERIDOS:**
   - Muestra al autor los hallazgos obligatorios.
   - Pregúntale con AskUserQuestion (selección múltiple) cuáles quiere corregir.
   - Delega cada corrección al responsable que indicó el reviewer: el `coder` para código, el `test-writer` para pruebas que faltan.
   - Ejecuta las verificaciones de `/sdd-build`, haz commit `fix(NNN): correcciones de la revisión` (o `test(NNN): ...` si solo cambiaron pruebas) y vuelve al paso 2.
   - Máximo 2 ciclos; después, decide el autor.

5. **Si el veredicto es APROBADO:**
   - **Spec viva.** Si el reviewer listó desviaciones entre spec/plan y código, explícaselas al autor. Los documentos se corrigen **en `core-bancario`** (commit `docs(NNN): spec y plan actualizados` en su siguiente PR); anótalo como pendiente en el resumen.
   - **Punto de comprensión.** Muestra las preguntas de comprensión del reviewer y pide al autor que las responda con sus palabras. Dale retroalimentación breve y honesta: qué entendió bien y qué le falta, señalando el archivo o la sección de `learning.md` donde está la respuesta. Si prefiere saltarse este paso, respétalo.
   - Haz commit `docs(NNN): revisión del bloque <bloque>` con `review.md`.
   - **Pull request.** Explica cómo abrirlo: `git push -u origin <rama>` y `gh pr create --fill` (o desde GitHub). Ofrece ejecutarlos, pero solo con su confirmación. El merge a `main` lo hace el autor.
   - **Siguiente paso, con su ubicación.** Tras el merge, lo siguiente suele estar en `core-bancario`: allí `/sdd-build` marcará con `[x]` las tareas de este PR (a partir de `avance.md`) antes de seguir. Díselo así: "Siguiente: abrir Claude en `core-bancario` (`C:\Users\miguel\source\repos\core-bancario`)…".
