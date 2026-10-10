import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';

/**
 * Rutas de la aplicación.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'app',
    pathMatch: 'full',
  },

  // Rutas públicas — autenticación
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // Restablecimiento de contraseña — pública
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },

  // Rutas protegidas — envueltas en TabsLayout
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/tabs-layout/tabs-layout.component').then((m) => m.TabsLayoutComponent),
    children: [
      { path: '', redirectTo: 'active', pathMatch: 'full' },
      {
        path: 'active',
        loadComponent: () =>
          import('./features/shopping/active-list/active-list.page').then((m) => m.ActiveListPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
      // Compras (spec 0016): gasto por mes, compras y boletas; reemplaza a Boletas e Historial.
      {
        path: 'purchases',
        loadComponent: () =>
          import('./features/shopping/purchases/purchases.page').then((m) => m.PurchasesPage),
      },
      {
        path: 'purchases/:id',
        loadComponent: () =>
          import('./features/shopping/purchases/purchase-detail.page').then(
            (m) => m.PurchaseDetailPage
          ),
      },
      { path: 'receipt', redirectTo: 'purchases', pathMatch: 'full' },
      { path: 'history', redirectTo: 'purchases', pathMatch: 'full' },
      // Toda boleta cierra una compra (spec 0008): a pantalla completa, desde Finalizar o Compras.
      {
        path: 'close',
        loadComponent: () =>
          import('./features/shopping/purchase-close/purchase-close.page').then(
            (m) => m.PurchaseClosePage
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/shopping/products/products.page').then((m) => m.ProductsPage),
      },
      // Ficha de producto (spec 0017): la barra sigue marcando Catálogo.
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/shopping/products/product-sheet.page').then((m) => m.ProductSheetPage),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'app',
  },
];
