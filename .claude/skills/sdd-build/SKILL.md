---
name: sdd-build
description: Fase Build del flujo SDD en el repo web. Comprueba que lo siguiente toca aquí; después el subagente test-writer escribe las pruebas en rojo y el subagente coder implementa hasta que pasen.
argument-hint: '[NNN-slug]'
disable-model-invocation: true
---

# Fase Build en el web: rojo → verde

Feature: $ARGUMENTS. La spec, el plan y las tareas están en `../core-bancario/specs/$ARGUMENTS/` (otro repositorio, solo lectura). La bitácora de este repo va en `construccion/$ARGUMENTS/`.

## Pasos

1. **¿Estamos en el repo correcto?** Antes de nada:
   - Comprueba que existe `../core-bancario`. Si no, detente: hay que clonarlo al lado de este repo.
   - Con `git -C ../core-bancario fetch` y `git -C ../core-bancario status -sb`, comprueba que está en `main` y al día con `origin/main`. Si no, díselo al autor y pídele que lo actualice: la spec que vale es la de `main`.
   - Verifica que `plan.md` dice `Estado: Aprobado`. Si no, detente: la fase Design se hace en `core-bancario`.

2. **¿Lo siguiente toca aquí?** En `tasks.md`, busca la primera tarea pendiente: sin `[x]` allí **y** sin aparecer en `construccion/$ARGUMENTS/avance.md`.
   - Si su `Repo:` es `core-bancario`, **detente** y dile al autor: "La siguiente tarea es Txx, del backend. Abre Claude en `core-bancario` (`C:\Users\miguel\source\repos\core-bancario`) y ejecuta allí `/sdd-build $ARGUMENTS`."
   - Si es de este repo, el **PR en curso** es la sección de `tasks.md` que la contiene (por ejemplo, "PR 2 de 004a — repo `core-bancario-web`"). Comprueba que todas las tareas del backend de ese bloque tienen `[x]` en `core-bancario` (su PR está mergeado). Si no, detente: un cambio de contrato va primero en el backend (ADR-0005).
   - Dile al autor qué sección vas a construir y qué tareas incluye.

3. **Rama.** Usa la rama que nombra el plan para ese bloque (por ejemplo, `feature/004a-sesion-y-cliente`). Si estás en `main`, créala; si no hay cambios sin commit, sigue. Si los hay, pregunta al autor qué hacer.

4. **Rojo.** Delega al subagente `test-writer` con el nombre de la feature y el título de la sección del PR en curso.

5. **Verifica tú el rojo** con `npm run typecheck`, `npm run lint` y `npm test` (y `npm run e2e:simulado` si hay pruebas simuladas nuevas):
   - los tipos y el lint pasan;
   - las pruebas nuevas fallan por `SDD: no implementado` o por una aserción, no por errores de tipos ni de importación;
   - las pruebas anteriores siguen pasando.

   Si algo no se cumple, reanuda al test-writer con SendMessage explicando el problema.

6. Haz commit `test(NNN): pruebas en rojo del bloque <bloque>`. El reviewer usará este commit para comprobar que nadie cambió las pruebas después.

7. **Verde.** Delega al subagente `coder` con el nombre de la feature y el título de la sección del PR en curso.

8. Ejecuta `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e:simulado`. Si falla algo, reanuda al coder con SendMessage pasándole lo que falla y sus mensajes de error. Máximo 3 rondas; si sigue fallando, detente y explica al autor qué ocurre.

9. Si el coder reporta que una prueba o el plan le parecen incorrectos, no lo resuelvas tú: muéstraselo al autor. Una prueba se corrige con el test-writer; un plan incorrecto obliga a volver a Design **en `core-bancario`**.

10. Con todo en verde, haz commit `feat(NNN): implementación del bloque <bloque>`.

11. **Resumen para el autor**: tareas completadas, número de pruebas y su resultado, archivos principales y la ruta de `construccion/$ARGUMENTS/learning.md`. Recomiéndale leer `learning.md` antes de la revisión.

12. Indica el siguiente paso: `/sdd-review $ARGUMENTS`, en este mismo repo.
