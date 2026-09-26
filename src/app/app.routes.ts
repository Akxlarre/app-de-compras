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
      {
        path: 'receipt',
        loadComponent: () =>
          import('./features/shopping/receipt-scanner/receipt-scanner.page').then(
            (m) => m.ReceiptScannerPage
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/shopping/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/shopping/products/products.page').then((m) => m.ProductsPage),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'app',
  },
];
