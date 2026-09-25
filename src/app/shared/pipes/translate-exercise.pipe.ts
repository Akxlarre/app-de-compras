import { Pipe, PipeTransform } from '@angular/core';

const DICTIONARY: Record<string, string> = {
  // Muscle groups
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  quadriceps: 'Cuádriceps',
  hamstrings: 'Isquios',
  calves: 'Gemelos',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  abs: 'Abdomen',
  glutes: 'Glúteos',
  cardio: 'Cardio',
  core: 'Core',
  fullbody: 'Cuerpo completo',
  
  // Equipment
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  cable: 'Polea',
  machine: 'Máquina',
  bodyweight: 'Peso Corporal',
  kettlebell: 'Pesa Rusa',
  bands: 'Bandas',
  none: 'Ninguno',
  
  // Category
  strength: 'Fuerza',
  hypertrophy: 'Hipertrofia',
  endurance: 'Resistencia',
  flexibility: 'Flexibilidad',
  power: 'Potencia'
};

@Pipe({
  name: 'translateExercise',
  standalone: true
})
export class TranslateExercisePipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    const key = value.toLowerCase().trim();
    return DICTIONARY[key] || value;
  }
}
