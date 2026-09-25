import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '@core/facades/auth.facade';
import { validateEmail } from '@core/utils';
import { IconComponent } from '@shared/components/icon/icon.component';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';

// SEC-T01: Client-side constraints — validated BEFORE calling the auth API
// to prevent unnecessary network calls and provide instant feedback.
const PASSWORD_MIN_LENGTH = 8;
const DISPLAY_NAME_MAX_LENGTH = 100;

// SEC-T05: Map raw Supabase/network error messages to user-safe strings.
// Prevents leaking internal API details (table names, query hints, stack traces).
function sanitizeAuthError(rawMessage: string): string {
  const msg = (rawMessage ?? '').toLowerCase();
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials') ||
    msg.includes('correo o contraseña incorrectos')
  )
    return 'Correo o contraseña incorrectos.';
  if (
    msg.includes('email not confirmed') ||
    msg.includes('confirmar tu correo') ||
    msg.includes('debes confirmar')
  )
    return 'Confirma tu correo antes de iniciar sesión.';
  if (
    msg.includes('user already registered') ||
    msg.includes('already been registered') ||
    msg.includes('ya está registrado') ||
    msg.includes('ya existe una cuenta')
  )
    return 'Ya existe una cuenta con este correo. Por favor inicia sesión.';
  if (
    msg.includes('password should be') ||
    msg.includes('password is too short') ||
    msg.includes('al menos 6 caracteres') ||
    msg.includes('al menos 8 caracteres')
  )
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('demasiados intentos')
  )
    return 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('conexión'))
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';

  // Si ya es un mensaje en español entendible, no ocultarlo con el error genérico
  if (
    rawMessage &&
    !rawMessage.toLowerCase().includes('database error') &&
    !rawMessage.toLowerCase().includes('internal')
  ) {
    return rawMessage;
  }
  return 'Ocurrió un error. Intenta de nuevo o contacta a soporte.';
}

/**
 * LoginComponent — Página pública de inicio de sesión.
 *
 * Genérico y reutilizable. Usa design tokens del sistema
 * y AuthFacade para autenticación con Supabase.
 *
 * Modos disponibles: login | register | reset
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div
      data-anim="ceremonia"
      class="tier-ceremonia flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-base)] px-4 py-8 relative overflow-hidden"
    >
      <!-- Ambient background glow -->
      <div
        class="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[var(--color-primary-dark)]/15 blur-[120px] rounded-full"
      ></div>

      <!-- Main Brand Header -->
      <div class="mb-8 text-center relative z-10 ">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-[var(--ds-brand)]/20 to-[var(--color-primary-dark)]/5 border border-[var(--ds-brand)]/30 mb-3 shadow-lg shadow-[var(--ds-brand)]/10"
        >
          <app-icon name="shopping-cart" [size]="24" [color]="'var(--ds-brand)'" />
        </div>
        <h1 class="m-0 text-3xl font-normal font-display tracking-tighter text-primary sm:text-4xl">
          APP DE <span class="text-[var(--ds-brand)]">COMPRAS</span>
        </h1>
        <p
          class="m-0 mt-1 text-[var(--text-floor,13px)] font-medium uppercase tracking-widest text-muted"
        >
          La lista del súper, en familia
        </p>
      </div>

      <!-- Auth Glass Card -->
      <div
        class="w-full max-w-[390px] rounded-2xl border border-subtle bg-surface p-7 shadow-2xl backdrop-blur-xl relative z-10"
      >
        <div class="mb-6 text-center">
          <h2
            class="m-0 text-xl tracking-tight text-primary"
            style="font-family: var(--font-body); font-weight: 800;"
          >
            @switch (mode()) { @case ('register') { Crear Cuenta } @case ('reset') { Recuperar
            Contraseña } @default { Iniciar Sesión } }
          </h2>
          <p class="m-0 mt-1.5 text-[var(--text-floor,13px)] text-muted">
            @switch (mode()) { @case ('register') { Únete para registrar y monitorear tus progresos
            } @case ('reset') { Ingresa tu correo para restablecer tu clave } @default { Ingresa tus
            credenciales para continuar } }
          </p>
        </div>

        <!-- Error message -->
        @if (errorMsg()) {
        <div
          class="mb-4 flex items-center gap-2 rounded-xl border-2 border-dashed border-error bg-error/10 px-3.5 py-3 text-[var(--text-floor,13px)] font-medium text-error"
          role="alert"
        >
          <app-icon name="alert-circle" [size]="14" />
          <span>{{ errorMsg() }}</span>
        </div>
        }

        <!-- Success message -->
        @if (successMsg()) {
        <div
          class="mb-4 flex items-center gap-2 rounded-xl border-2 border-dashed border-success bg-success/10 px-3.5 py-3 text-[var(--text-floor,13px)] font-medium text-success"
          role="status"
        >
          <app-icon name="check" [size]="14" />
          <span>{{ successMsg() }}</span>
        </div>
        }

        <!-- Form -->
        <form class="flex flex-col gap-4" (ngSubmit)="onSubmit()">
          <!-- Email -->
          <div class="flex flex-col gap-1.5">
            <label
              for="email"
              class="text-[var(--text-floor,13px)] font-semibold uppercase tracking-wider text-muted"
              >Correo electrónico</label
            >
            <input
              id="email"
              type="email"
              class="h-12 w-full rounded-xl bg-elevated border border-subtle px-4 text-sm text-primary placeholder-zinc-500 outline-none transition-all focus:border-[var(--ds-brand)] focus:bg-[var(--ds-brand)]/[0.02] focus:ring-2 focus:ring-[var(--ds-brand)]/20"
              placeholder="tu@correo.com"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
            />
          </div>

          <!-- Password (not in reset mode) -->
          @if (mode() !== 'reset') {
          <div class="flex flex-col gap-1.5">
            <label
              for="password"
              class="text-[var(--text-floor,13px)] font-semibold uppercase tracking-wider text-muted"
              >Contraseña</label
            >
            <input
              id="password"
              type="password"
              class="h-12 w-full rounded-xl bg-elevated border border-subtle px-4 text-sm text-primary placeholder-zinc-500 outline-none transition-all focus:border-[var(--ds-brand)] focus:bg-[var(--ds-brand)]/[0.02] focus:ring-2 focus:ring-[var(--ds-brand)]/20"
              placeholder="••••••••"
              [(ngModel)]="password"
              name="password"
              required
              autocomplete="current-password"
            />
          </div>
          }

          <!-- Display name (register only) -->
          @if (mode() === 'register') {
          <div class="flex flex-col gap-1.5">
            <label
              for="displayName"
              class="text-[var(--text-floor,13px)] font-semibold uppercase tracking-wider text-muted"
              >Nombre</label
            >
            <input
              id="displayName"
              type="text"
              class="h-12 w-full rounded-xl bg-elevated border border-subtle px-4 text-sm text-primary placeholder-zinc-500 outline-none transition-all focus:border-[var(--ds-brand)] focus:bg-[var(--ds-brand)]/[0.02] focus:ring-2 focus:ring-[var(--ds-brand)]/20"
              placeholder="Tu nombre"
              [(ngModel)]="displayName"
              name="displayName"
              autocomplete="name"
            />
          </div>
          }

          <!-- Submit button (Clean 48px height with gradient and tactile feedback) -->
          <button
            type="submit"
            class="mt-1 h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--ds-brand)] font-bold text-sm tracking-wide text-primary shadow-lg shadow-[var(--ds-brand)]/25 transition-all duration-150 hover:from-[var(--ds-brand)] hover:to-[var(--color-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex"
            [disabled]="loading()"
          >
            @if (loading()) {
            <span
              class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            ></span>
            }
            <span>
              @switch (mode()) { @case ('register') { Crear Cuenta } @case ('reset') { Enviar Enlace
              } @default { Iniciar Sesión } }
            </span>
          </button>
        </form>

        <!-- Footer links -->
        <div
          class="mt-6 flex items-center justify-center gap-2.5 text-[var(--text-floor,13px)] text-muted border-t border-subtle pt-5"
        >
          @switch (mode()) { @case ('login') {
          <button
            class="cursor-pointer border-none bg-transparent p-0 min-h-[44px] inline-flex items-center text-muted transition-colors hover:text-[var(--color-primary-hover)]"
            (click)="switchMode('reset')"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <span class="text-secondary">·</span>
          <button
            class="cursor-pointer border-none bg-transparent p-0 min-h-[44px] inline-flex items-center font-semibold text-[var(--color-primary-hover)] transition-colors hover:text-primary"
            (click)="switchMode('register')"
          >
            Crear cuenta
          </button>
          } @case ('register') {
          <span class="text-muted">¿Ya tienes cuenta?</span>
          <button
            class="cursor-pointer border-none bg-transparent p-0 min-h-[44px] inline-flex items-center font-semibold text-[var(--color-primary-hover)] transition-colors hover:text-primary"
            (click)="switchMode('login')"
          >
            Inicia sesión
          </button>
          } @case ('reset') {
          <button
            class="cursor-pointer border-none bg-transparent p-0 min-h-[44px] inline-flex items-center font-semibold text-[var(--color-primary-hover)] transition-colors hover:text-primary"
            (click)="switchMode('login')"
          >
            Volver a iniciar sesión
          </button>
          } }
        </div>
      </div>
    </div>
  `,
  host: { style: 'display: contents;' },
})
export class LoginComponent implements AfterViewInit {
  private readonly gsap = inject(GsapAnimationsService);
  private readonly el = inject(ElementRef);

  ngAfterViewInit() {
    this.gsap.animateTierEnter(this.el.nativeElement);
  }
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'register' | 'reset'>('login');
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  email = '';
  password = '';
  displayName = '';

  switchMode(newMode: 'login' | 'register' | 'reset'): void {
    this.mode.set(newMode);
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  async onSubmit(): Promise<void> {
    this.errorMsg.set('');
    this.successMsg.set('');

    // SEC-T01: Client-side validation — fail fast before hitting the network.
    const validationError = this.validate();
    if (validationError) {
      this.errorMsg.set(validationError);
      return;
    }

    this.loading.set(true);

    try {
      switch (this.mode()) {
        case 'login': {
          const { error } = await this.auth.login(this.email.trim(), this.password);
          if (error) {
            this.errorMsg.set(sanitizeAuthError(error.message)); // SEC-T05
          } else {
            this.router.navigate(['/app']);
          }
          break;
        }

        case 'register': {
          const { data, error } = await this.auth.signUp(this.email.trim(), this.password, {
            data: { display_name: this.displayName.trim() || undefined },
          });
          if (error) {
            this.errorMsg.set(sanitizeAuthError(error.message)); // SEC-T05
          } else if (data?.session) {
            // SEC-T06: signUp() ya devolvió sesión válida, pero el signal de
            // AuthFacade se actualiza async vía onAuthStateChange. authGuard
            // lo lee sincrónicamente al navegar — sin esperar aquí, el guard
            // puede verlo en false y rebotar el navigate() silenciosamente.
            await this.waitForAuthSync();
            this.router.navigate(['/app']);
          } else {
            this.successMsg.set('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
            this.switchMode('login');
          }
          break;
        }

        case 'reset': {
          const { error } = await this.auth.resetPasswordForEmail(this.email.trim());
          if (error) {
            this.errorMsg.set(sanitizeAuthError(error.message)); // SEC-T05
          } else {
            this.successMsg.set('Se envió un enlace de recuperación a tu correo.');
          }
          break;
        }
      }
    } catch {
      this.errorMsg.set('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * SEC-T06: Espera (con timeout corto) a que AuthFacade.isAuthenticated()
   * refleje la sesión recién creada por signUp(), ya que el signal se
   * actualiza async vía onAuthStateChange y authGuard lo lee sincrónicamente.
   */
  private async waitForAuthSync(timeoutMs = 2000): Promise<void> {
    const start = Date.now();
    while (!this.auth.isAuthenticated() && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /** SEC-T01: Validates form fields before any network call. Returns error string or null. */
  private validate(): string | null {
    const email = this.email.trim();
    if (!email) return 'El correo es obligatorio.';
    if (!validateEmail(email)) return 'El correo no tiene un formato válido.';

    if (this.mode() !== 'reset') {
      if (!this.password) return 'La contraseña es obligatoria.';
      if (this.password.length < PASSWORD_MIN_LENGTH)
        return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (this.mode() === 'register') {
      const name = this.displayName.trim();
      if (name.length > DISPLAY_NAME_MAX_LENGTH)
        return `El nombre no puede superar los ${DISPLAY_NAME_MAX_LENGTH} caracteres.`;
    }

    return null;
  }
}
