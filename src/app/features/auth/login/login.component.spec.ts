import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthFacade } from '@core/facades/auth.facade';
import { GsapAnimationsService } from '@core/services/ui/gsap-animations.service';
import { LucideAngularModule, ShoppingCart, Mail, Eye, EyeOff } from 'lucide-angular';

describe('LoginComponent — marca', () => {
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        LucideAngularModule.pick({ ShoppingCart, Mail, Eye, EyeOff }),
      ],
      providers: [
        { provide: AuthFacade, useValue: { login: vi.fn(), resetPasswordForEmail: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: GsapAnimationsService, useValue: { animateTierEnter: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('muestra la marca de App de Compras y no la heredada de FitTrack', () => {
    const header = (fixture.nativeElement as HTMLElement).querySelector('h1')!.parentElement!;
    const text = header.textContent!.replace(/\s+/g, ' ');

    expect(text).toContain('APP DE COMPRAS');
    expect(text).toContain('La lista del súper, en familia');
    expect(text).not.toMatch(/FIT\s*TRACK|entrenamiento/i);
    expect(header.querySelector('app-icon')?.getAttribute('name')).toBe('shopping-cart');
  });
});
