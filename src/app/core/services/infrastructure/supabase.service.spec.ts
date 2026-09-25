import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseService],
    });

    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('onAuthStateChange devuelve una función que cancela la suscripción', () => {
    const unsubscribe = vi.fn();
    const callback = vi.fn();
    const spy = vi
      .spyOn(service.client.auth, 'onAuthStateChange')
      .mockReturnValue({ data: { subscription: { unsubscribe } } } as any);

    const stop = service.onAuthStateChange(callback);

    expect(spy).toHaveBeenCalledWith(callback);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('updatePassword delega en auth.updateUser', async () => {
    const spy = vi
      .spyOn(service.client.auth, 'updateUser')
      .mockResolvedValue({ data: { user: null }, error: null } as any);

    await service.updatePassword('nueva-clave');

    expect(spy).toHaveBeenCalledWith({ password: 'nueva-clave' });
  });
});
