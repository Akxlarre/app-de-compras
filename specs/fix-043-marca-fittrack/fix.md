> id: fix-043-marca-fittrack
> refs: Captura del login en ng serve (sesión 2026-09-25)
> status: done
> created: 2026-09-25

## Síntoma
El login y "Restablecer contraseña" muestran la marca heredada: ícono de mancuerna,
"FITTRACK" y "Tu diario de entrenamiento y fuerza". El toast de actualización dice
"Ya tenés la última versión de FitTrack".

## Causa raíz
Restos del clon de la app de entrenamiento sin reemplazar.

## Solución
- Wordmark "APP DE COMPRAS" (acento de marca en "COMPRAS") + tagline "La lista del súper, en familia"
  (frase guía de `docs/PRODUCT-VISION.md`) e ícono `shopping-cart` en login y reset-password.
- Registrar `ShoppingCart` en `app.config.ts` / `PROVIDED_ICONS` en lugar de `Dumbbell` (sin otros usos).
- Toast de actualización y `title` de `app.ts` con el nombre nuevo.
- Fuera de alcance: `appId`/`appName` de Capacitor (afectan actualizaciones del APK instalado).

## Acceptance Criteria
- [x] AC1: No quedan "FitTrack", "entrenamiento y fuerza" ni el ícono `dumbbell` en `src/app`.
- [x] AC2: Login y reset-password muestran la marca nueva (verificado con captura).
- [x] AC3: `npm run test:ci`, `npm run lint:arch` y `ng build` en verde.

## Test de regresión
`src/app/features/auth/login/login.component.spec.ts` (nuevo): el header muestra la marca nueva y
no la heredada.
