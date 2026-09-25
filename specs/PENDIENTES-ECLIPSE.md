# Rediseño Eclipse — estado y pendientes

> Escrito el 2026-09-20 al cerrar la sesión de rediseño, para que otra
> sesión (u otra IA) siga sin tener que reconstruir el contexto.
> **Leer entero antes de tocar código.**

## Dónde está el rediseño

| Vista | Track | Estado |
|---|---|---|
| Entrenar | 0008 | ✅ hecho |
| Cascada Ionic / Tailwind | fix-036 | ✅ hecho |
| Selector de ejercicios | 0009 | ✅ hecho |
| Sesión activa (registro) | 0010 | ✅ hecho |
| Sesión activa (modales) | 0011 | ✅ hecho |
| Editor de rutinas | 0012 | ✅ hecho — PR #16 |
| Tipografía de Ionic (todo salía en Roboto) | fix-037 | ✅ hecho — PR #17 |
| Historial | 0013 | ✅ hecho — PR #18 |
| Nombres del Catálogo en Anton | fix-038 | ✅ hecho — PR #19 |
| **Plan (mesociclo) y su creador** | **0014** | ⬜ contrato escrito, sin implementar |
| **Login y recuperar contraseña** | **0015** | ⬜ contrato escrito, sin implementar |

Los contratos de 0014 y 0015 están en `specs/0014-plan-eclipse/` y
`specs/0015-login-eclipse/`, cada uno con `spec.md` (qué y cómo se
verifica) y `plan.md` (pasos y orden de commits).

## PRs abiertos al 2026-09-20 — ninguno mergeado

| PR | Rama | Base | Contenido |
|---|---|---|---|
| #16 | `feature/editor-rutinas-eclipse` | `main` | Editor de rutinas (0012) |
| #17 | `fix/tipografia-ionic` | `main` | Tipografía de Ionic (fix-037) |
| #18 | `feature/historial-eclipse` | `fix/tipografia-ionic` | Historial (0013) |
| #19 | `fix/catalogo-nombres-anton` | `fix/tipografia-ionic` | Nombres del Catálogo (fix-038) |

**Orden de merge:** #17 primero (los otros dos apilados dependen de él),
después #18 y #19 en cualquier orden, y #16 cuando se quiera — es
independiente. Empezar 0014 o 0015 desde `main` **después** de mergear,
para no arrastrar el problema de la tipografía en las mediciones.

## Reglas del usuario que siguen vigentes

- **Solo diseño visual, nada de texto.** No se cambian copys, etiquetas
  ni mensajes. Si un texto molesta, se anota, no se toca.
- **El registro es voseo** y es decisión tomada: no pasarlo a tuteo.
- **Nunca commitear `src/environments/environment.ts`**: el server de
  desarrollo lo reescribe con las llaves del `.env`.
- **Nada de `git add -A`**: se ponen los archivos uno por uno.
- **Nada de push directo a `main`**: todo por PR.
- **No tocar la sesión del usuario** en el navegador (no cerrar sesión
  por cuenta propia) y **no crear cuentas ni escribir contraseñas**: si
  hace falta entrar o salir, lo hace la persona.
- **No mandarle mensajes al Coach** desde la app: cada mensaje consume
  API de verdad.
- Para verificar con datos, cargarlos **en memoria** desde la consola
  del navegador (así se probaron 0013 y fix-038). No escribir en la base
  del usuario ni tocar controles destructivos.

## Cómo se verifica una vista (lo que se usó en 0008–0019)

Navegador a **375×812**, medición antes y después con la misma consulta:
textos bajo 13px, textos en Anton bajo 28px, objetivos táctiles bajo
44px (56px en la sesión activa), y revisión de qué textos ganan líneas o
quedan cortados. La consulta completa está en
`specs/0014-plan-eclipse/spec.md`. Cada track cierra con su
`acceptance.md` con los números medidos; el modelo a copiar es
`specs/0013-historial/acceptance.md` (vive en la rama de PR #18).

## Hallazgos anotados, sin dueño todavía

1. **Entrada animada de Historial**: tarda unos 5 segundos en asentar la
   cuarta tarjeta y se reinicia cuando cambia el historial. Es
   movimiento, no diseño estático; necesita su propio track.
2. **Datos del Catálogo sin traducir**: al menos una fila muestra
   "Chest · Barbell · Strength". Es dato sembrado, no estilo.
3. **La regla global `h1, h2` es una trampa**: asume que todo `h1`/`h2`
   renderiza por encima de 28px, y deja de ser cierto en cuanto un
   componente le baja el tamaño — ya pasó en el Catálogo (fix-038), en
   Historial (0013) y pasa hoy en el Plan y en el login. Cuando 0014 y
   0015 estén hechos, evaluar quitarle `h2` a esa regla y que cada
   título pida Anton explícitamente. Es un cambio con alcance en toda la
   app: merece su propio track y su propia medición.
4. **`.exercise-meta` del Catálogo** conserva sus `!important`. Se midió
   que en `.exercise-name` ya no hacían falta (fix-036 reordenó las
   capas); lo más probable es que ahí tampoco.
5. **`indices/STYLES.md` está desactualizado** en una línea: dice que
   `--ion-color-primary` sigue en el azul de Ionic, pero hoy apunta a
   `var(--color-primary)` (ember). Corregir al pasar por ahí.

## Trampas del entorno (todas se pagaron ya una vez)

- **`indices/` está en `.gitignore`**: no viaja con el repo. Otra
  máquina no los tiene, y el Discovery Gate exige leer al menos uno
  antes de escribir en `src/app/`. Si faltan, regenerarlos con
  `npm run indices:sync` antes de empezar.
- **El primer build del server de desarrollo tarda ~3 minutos**, y cada
  ruta compila su chunk la primera vez que se visita. Medir demasiado
  pronto da "0 elementos" y hace creer que algo se rompió.
- **Al entrar por URL a una ruta protegida, el guard gana la carrera** y
  rebota a `/login` aunque haya sesión. Navegar de nuevo a la misma URL
  y espera: la segunda vez entra.
- **El Bash Guard bloquea crear `.ts/.html/.scss` por Bash** (usar Edit
  o Write) y también se dispara con `<` o `>` dentro de un patrón de
  `grep`, porque los lee como redirección.
- **PowerShell rompe los here-strings de `git commit -m`**: escribir el
  mensaje a un archivo y usar `git commit -F`.
- **El hook de Prettier reformatea el archivo al editarlo**: si mete
  ruido, separar el formateo en su propio commit `style(...)`.
- **Presupuesto de estilos por componente**: 10 kB avisa, 12 kB rompe el
  build. Si una vista se pasa, mover a `tailwind.css` lo que se repita
  (precedente: `.modal-btn-*` en 0011).
- Un `git push` se colgó una vez por red; reintentar antes de investigar.
