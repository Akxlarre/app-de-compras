import {
  getExerciseIcon,
  getStepPhase,
  isUntranslated,
  parseInstructions,
} from './exercise-detail.utils';

describe('exercise-detail.utils', () => {
  describe('parseInstructions', () => {
    it('devuelve lista vacía sin texto', () => {
      expect(parseInstructions(undefined)).toEqual([]);
      expect(parseInstructions('')).toEqual([]);
    });

    it('separa por saltos de línea reales y literales, y descarta vacíos', () => {
      expect(parseInstructions('Uno\\nDos\n\nTres')).toEqual(['Uno', 'Dos', 'Tres']);
    });

    it('quita la numeración y los guiones del comienzo de cada paso', () => {
      expect(parseInstructions('1. Acostate\n2) Subí\n- Bajá\nPaso 4: Respirá')).toEqual([
        'Acostate',
        'Subí',
        'Bajá',
        'Respirá',
      ]);
    });
  });

  describe('getStepPhase', () => {
    it('nombra el primero, el último y los del medio', () => {
      expect(getStepPhase(0, 4).label).toBe('Posición Inicial');
      expect(getStepPhase(3, 4).label).toBe('Finalización');
      expect(getStepPhase(1, 4).label).toBe('Paso 2');
    });
  });

  describe('isUntranslated', () => {
    it('es true si falta el español o si es igual al inglés', () => {
      expect(isUntranslated(undefined, 'Lie down')).toBe(true);
      expect(isUntranslated('Lie down', 'Lie down ')).toBe(true);
    });

    it('es false si hay una traducción distinta', () => {
      expect(isUntranslated('Acostate', 'Lie down')).toBe(false);
    });
  });

  describe('getExerciseIcon', () => {
    it('elige por grupo muscular, en español o inglés', () => {
      expect(getExerciseIcon('Pecho', 'Fuerza')).toBe('shield-check');
      expect(getExerciseIcon('back', 'strength')).toBe('layers');
      expect(getExerciseIcon('Abdominales', 'Fuerza')).toBe('circle');
    });

    it('reconoce los términos que solo tenía la copia del selector', () => {
      expect(getExerciseIcon('Hamstrings', 'Fuerza')).toBe('activity');
      expect(getExerciseIcon('calves', 'strength')).toBe('activity');
      expect(getExerciseIcon('Deltoides', 'Fuerza')).toBe('dumbbell');
    });

    it('usa la categoría cardio si el músculo no decide', () => {
      expect(getExerciseIcon('', 'Cardio')).toBe('activity');
    });

    it('cae en mancuerna por defecto', () => {
      expect(getExerciseIcon('desconocido', 'otra')).toBe('dumbbell');
    });
  });
});
