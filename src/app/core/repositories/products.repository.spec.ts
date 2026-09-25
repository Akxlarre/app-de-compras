import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductsRepository } from './products.repository';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { queryMock, supabaseServiceMock } from '../../../testing/supabase-query.mock';

describe('ProductsRepository', () => {
  let repo: ProductsRepository;
  let mock: ReturnType<typeof supabaseServiceMock>;

  beforeEach(() => {
    mock = supabaseServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: mock.service }],
    });
    repo = TestBed.inject(ProductsRepository);
  });

  it('findByFamily filtra por familia, ordena por nombre y respeta el límite', async () => {
    const q = queryMock({ data: [{ id: 'p1' }] });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByFamily('fam-1', 8)).toEqual([{ id: 'p1' }]);
    expect(mock.shop.from).toHaveBeenCalledWith('products');
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.order).toHaveBeenCalledWith('name');
    expect(q.limit).toHaveBeenCalledWith(8);
  });

  it('findByFamily sin límite no llama a limit', async () => {
    const q = queryMock({ data: null });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findByFamily('fam-1')).toEqual([]);
    expect(q.limit).not.toHaveBeenCalled();
  });

  it('searchByName usa ilike con comodines', async () => {
    const q = queryMock({ data: [] });
    mock.shop.from.mockReturnValue(q);

    await repo.searchByName('lec', 20);

    expect(q.ilike).toHaveBeenCalledWith('name', '%lec%');
    expect(q.limit).toHaveBeenCalledWith(20);
  });

  it('create inserta (con precio opcional) y devuelve el producto', async () => {
    const q = queryMock({ data: { id: 'p9', name: 'Pan' } });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.create({ name: 'Pan', familyId: 'fam-1', lastPrice: 900 })).toEqual({
      id: 'p9',
      name: 'Pan',
    });
    expect(q.insert).toHaveBeenCalledWith({ name: 'Pan', family_id: 'fam-1', last_price: 900 });

    await repo.create({ name: 'Sal', familyId: 'fam-1' });
    expect(q.insert).toHaveBeenLastCalledWith({ name: 'Sal', family_id: 'fam-1' });
  });

  it('findIdByName busca sin distinguir mayúsculas dentro de la familia', async () => {
    const q = queryMock({ data: { id: 'p1' } });
    mock.shop.from.mockReturnValue(q);

    expect(await repo.findIdByName('fam-1', 'Leche')).toBe('p1');
    expect(q.eq).toHaveBeenCalledWith('family_id', 'fam-1');
    expect(q.ilike).toHaveBeenCalledWith('name', 'Leche');
    expect(q.limit).toHaveBeenCalledWith(1);
  });

  it('findIdByName devuelve null si no existe', async () => {
    mock.shop.from.mockReturnValue(queryMock({ data: null }));
    expect(await repo.findIdByName('fam-1', 'x')).toBeNull();
  });

  it('updatePrice actualiza last_price y updated_at', async () => {
    const q = queryMock();
    mock.shop.from.mockReturnValue(q);

    await repo.updatePrice('p1', 1990);

    expect(q.update).toHaveBeenCalledWith({ last_price: 1990, updated_at: expect.any(String) });
    expect(q.eq).toHaveBeenCalledWith('id', 'p1');
  });

  it('lanza el error de Supabase', async () => {
    const error = { message: 'boom' };
    mock.shop.from.mockReturnValue(queryMock({ error }));
    await expect(repo.searchByName('x', 1)).rejects.toBe(error);
  });
});
