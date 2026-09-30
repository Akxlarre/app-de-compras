import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RestockStripComponent } from './restock-strip.component';
import type { RestockSuggestion } from '@core/models/restock.model';

const suggestion = (
  id: string,
  daysSince = 12,
  intervalDays = 10,
  learned = true
): RestockSuggestion =>
  ({ product: { id, name: id }, daysSince, intervalDays, learned } as RestockSuggestion);

describe('RestockStripComponent (spec 0014)', () => {
  let component: RestockStripComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<RestockStripComponent>>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RestockStripComponent] });
    fixture = TestBed.createComponent(RestockStripComponent);
    component = fixture.componentInstance;
  });

  it('muestra hasta 5 y el resto detrás de "Ver N más"', () => {
    fixture.componentRef.setInput(
      'suggestions',
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => suggestion(id))
    );

    expect(component.visible().map((s) => s.product.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(component.hidden()).toBe(2);

    component.expanded.set(true);
    expect(component.visible()).toHaveLength(7);
    expect(component.hidden()).toBe(0);
  });

  it('"Agregar todas" entrega los visibles', () => {
    fixture.componentRef.setInput(
      'suggestions',
      ['a', 'b'].map((id) => suggestion(id))
    );
    let added: string[] = [];
    component.addAll.subscribe((ids) => (added = ids));

    component.addVisible();

    expect(added).toEqual(['a', 'b']);
  });

  it('describe cuándo se compró y, si lo aprendió, cada cuánto', () => {
    expect(component.detail(suggestion('a', 12, 10, true))).toBe(
      'Hace 12 días · sueles comprarlo cada ~10'
    );
    expect(component.detail(suggestion('b', 8, 7, false))).toBe('Hace 8 días');
    expect(component.detail(suggestion('c', 1, 1, true))).toBe('Ayer · sueles comprarlo cada ~1');
  });
});
