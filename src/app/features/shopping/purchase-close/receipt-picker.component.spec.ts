import { TestBed } from '@angular/core/testing';
import { ActionSheetController } from '@ionic/angular';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReceiptPickerComponent } from './receipt-picker.component';

describe('ReceiptPickerComponent (spec 0016 AC13)', () => {
  let sheets: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sheets = { create: vi.fn().mockResolvedValue({ present: vi.fn() }) };
    TestBed.configureTestingModule({
      imports: [ReceiptPickerComponent],
      providers: [{ provide: ActionSheetController, useValue: sheets }],
    });
  });

  const setup = () => {
    const fixture = TestBed.createComponent(ReceiptPickerComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const camera = el.querySelector<HTMLInputElement>('[data-testid="boleta-camara"]')!;
    const gallery = el.querySelector<HTMLInputElement>('[data-testid="boleta-galeria"]')!;
    return { fixture, camera, gallery };
  };

  it('la cámara abre directo y la galería no (sin capture)', () => {
    const { camera, gallery } = setup();
    expect(camera.getAttribute('capture')).toBe('environment');
    expect(gallery.hasAttribute('capture')).toBe(false);
  });

  it('ofrece "Tomar foto" y "Elegir de la galería", cada una con su input', async () => {
    const { fixture, camera, gallery } = setup();
    const cameraClick = vi.spyOn(camera, 'click').mockImplementation(() => {});
    const galleryClick = vi.spyOn(gallery, 'click').mockImplementation(() => {});

    await fixture.componentInstance.open();
    const buttons = sheets.create.mock.calls[0][0].buttons;
    expect(buttons.map((b: { text: string }) => b.text)).toEqual([
      'Tomar foto',
      'Elegir de la galería',
      'Cancelar',
    ]);

    buttons[0].handler();
    expect(cameraClick).toHaveBeenCalled();
    buttons[1].handler();
    expect(galleryClick).toHaveBeenCalled();
  });

  it('entrega solo imágenes, hasta 5', () => {
    const { fixture } = setup();
    const picked = vi.fn();
    fixture.componentInstance.picked.subscribe(picked);
    const img = (n: number) => new File(['x'], `f${n}.jpg`, { type: 'image/jpeg' });
    const files = [...Array.from({ length: 6 }, (_, i) => img(i)), new File(['x'], 'a.pdf')];
    const input = { files, value: 'x' } as unknown as HTMLInputElement;

    fixture.componentInstance.onFiles({ target: input } as unknown as Event);

    expect(picked.mock.calls[0][0]).toHaveLength(5);
    expect(input.value).toBe('');
  });
});
