import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { MessageService } from 'primeng/api';
import { ToastController } from '@ionic/angular';

const mockMessageService = {
  add: vi.fn(),
  clear: vi.fn(),
};

describe('ToastService', () => {
  let service: ToastService;
  let present: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    present = vi.fn();
    create = vi.fn().mockResolvedValue({ present });
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: ToastController, useValue: { create } },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('action (spec 0013, Q27)', () => {
    it('muestra el aviso con un botón que ejecuta la acción', async () => {
      const onAction = vi.fn();

      await service.action('Quitaste Leche', 'Deshacer', onAction);

      expect(present).toHaveBeenCalled();
      const opts = create.mock.calls[0][0];
      expect(opts.message).toBe('Quitaste Leche');
      expect(opts.duration).toBeGreaterThanOrEqual(4000);
      const button = opts.buttons.find((b: { text: string }) => b.text === 'Deshacer');
      button.handler();
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
