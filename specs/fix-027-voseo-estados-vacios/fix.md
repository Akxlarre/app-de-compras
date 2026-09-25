# Fix descartado: pasar el voseo a tuteo

> id: fix-027-voseo-estados-vacios
> status: discarded
> created: 2026-09-15
> closed: 2026-09-15

## Por qué se descartó

El fix partía de una premisa equivocada: trataba el voseo como defecto
porque otros textos de la app tutean. **El voseo es una decisión tomada
por el usuario.** No es una inconsistencia a corregir.

Se revirtieron todos los cambios antes de commitear. No quedó ningún
texto modificado.

## Qué se había intentado

Pasar a tuteo cinco textos visibles:

- los estados vacíos de Entrenar ("Todavía no tenés rutinas", "Armá una
  plantilla...");
- el estado vacío del Catálogo ("Probá con otro término o quitá el
  filtro...");
- el "Consejo de técnica" del detalle de ejercicio y del selector
  ("Controlá el tempo... evitá usar el impulso...").

## Para quien venga después

No reabrir. Si aparecen textos en **tuteo** ("Comienza una sesión en
blanco", "Inténtalo de nuevo en unos segundos", el toast de fix-026),
esa es la desviación respecto de la decisión. Aun así, no se tocan sin
que el usuario lo pida: el trabajo en curso es solo de diseño visual.
