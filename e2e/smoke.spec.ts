import { test, expect } from '@playwright/test';

test.describe('App de Compras - E2E Smoke Tests', () => {

  test('debe cargar la página principal (Login o Active List)', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Asegurarse que el documento cargue sin errores
    const title = await page.title();
    expect(title).toBe('App de Compras');

    // Verifica que el contenedor principal de Ionic exista
    const root = page.locator('ion-app');
    await expect(root).toBeVisible();

    // Como la app está en PWA/Local, podríamos verificar si pide inicio de sesión o muestra el app-header
    // (Dependerá de si hay sesión local en el Storage)
  });

});
