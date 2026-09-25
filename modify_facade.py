# -*- coding: utf-8 -*-
import os

content = """import { Injectable, signal, inject, effect } from '@angular/core';
import { SupabaseService } from '../services/infrastructure/supabase.service';
import { Router } from '@angular/router';

export interface ActiveSet {
  id: string;
  set_number: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
  weight: number;
  reps: number;
  rir?: number;
  completed: boolean;
}

export interface ActiveExercise {
  exercise_id: string;
  exercise_name: string;
  sets: ActiveSet[];
}

export interface ActiveWorkoutState {
  start_time: Date;
  exercises: ActiveExercise[];
}

export interface WorkoutHistoryItem {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  total_volume: number;
  total_sets: number;
  exercises_summary: string[];
}

const STORAGE_KEY = 'fittrack_active_workout';

@Injectable({ providedIn: 'root' })
export class WorkoutFacade {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Estado del entrenamiento activo
  readonly activeSession = signal<ActiveWorkoutState | null>(null);
  readonly error = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  
  // Historial de entrenamientos
  readonly history = signal<WorkoutHistoryItem[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);

  constructor() {
    this.restoreSession();

    // Persistencia Automática
    effect(() => {
      const session = this.activeSession();
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }

  private restoreSession() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.start_time = new Date(parsed.start_time);
        this.activeSession.set(parsed);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  startAdhocWorkout() {
    this.activeSession.set({
      start_time: new Date(),
      exercises: []
    });
    this.router.navigate(['/app/workouts/active']);
  }

  addExercise(exerciseId: string, exerciseName: string) {
    this.activeSession.update(session => {
      if (!session) return session;
      const newExercise: ActiveExercise = {
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        sets: [{
          id: crypto.randomUUID(),
          set_number: 1,
          set_type: 'normal' as const,
          weight: 0,
          reps: 0,
          completed: false
        }]
      };
      return { ...session, exercises: [...session.exercises, newExercise] };
    });
  }

  removeExercise(exerciseId: string) {
    this.activeSession.update(session => {
      if (!session) return session;
      return {
        ...session,
        exercises: session.exercises.filter(ex => ex.exercise_id !== exerciseId)
      };
    });
  }

  addSet(exerciseId: string) {
    this.activeSession.update(session => {
      if (!session) return session;
      const exercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [...ex.sets, {
              id: crypto.randomUUID(),
              set_number: ex.sets.length + 1,
              set_type: 'normal' as const,
              weight: lastSet ? lastSet.weight : 0,
              reps: lastSet ? lastSet.reps : 0,
              completed: false
            }]
          };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  updateSet(exerciseId: string, setId: string, updates: Partial<ActiveSet>) {
    this.activeSession.update(session => {
      if (!session) return session;
      const exercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          const sets = ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s);
          return { ...ex, sets };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  removeSet(exerciseId: string, setId: string) {
    this.activeSession.update(session => {
      if (!session) return session;
      const exercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          const sets = ex.sets.filter(s => s.id !== setId).map((s, index) => ({
            ...s,
            set_number: index + 1
          }));
          return { ...ex, sets };
        }
        return ex;
      });
      return { ...session, exercises };
    });
  }

  discardWorkout() {
    this.activeSession.set(null);
    this.router.navigate(['/app/workouts']);
  }

  async finishWorkout() {
    const session = this.activeSession();
    if (!session) return;
    
    // Obtenemos el usuario autenticado
    const { data: userData } = await this.supabase.client.auth.getUser();
    if (!userData.user) {
      this.error.set("No hay usuario autenticado para guardar el entreno.");
      return;
    }

    this.isSaving.set(true);
    
    // 1. Insert Workout
    const { data: workout, error: wError } = await this.supabase.client
      .from('workouts')
      .insert({
        user_id: userData.user.id,
        start_time: session.start_time.toISOString(),
        end_time: new Date().toISOString()
      })
      .select('id')
      .single();

    if (wError || !workout) {
      this.error.set(wError?.message || 'Error guardando sesión');
      this.isSaving.set(false);
      return;
    }

    // 2. Insert Sets
    const setsToInsert = [];
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed) {
          setsToInsert.push({
            workout_id: workout.id,
            exercise_id: ex.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            is_warmup: set.set_type === 'warmup',
            is_failure: set.set_type === 'failure',
            rir: set.rir || null
          });
        }
      }
    }

    if (setsToInsert.length > 0) {
      const { error: sError } = await this.supabase.client
        .from('workout_sets')
        .insert(setsToInsert);

      if (sError) {
        this.error.set(sError.message);
        this.isSaving.set(false);
        return;
      }
    }

    this.isSaving.set(false);
    this.activeSession.set(null);
    this.router.navigate(['/app/workouts']);
  }

  async loadHistory() {
    this.isLoadingHistory.set(true);
    const { data: userData } = await this.supabase.client.auth.getUser();
    if (!userData.user) {
      this.isLoadingHistory.set(false);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('workouts')
      .select(\
        id, start_time, end_time,
        workout_sets (
          id, weight, reps,
          exercises ( name_es, name_en )
        )
      \)
      .eq('user_id', userData.user.id)
      .order('start_time', { ascending: false });

    if (error) {
      this.error.set(error.message);
    } else if (data) {
      const mapped = data.map(w => {
        let volume = 0;
        let sets = 0;
        const exMap = new Map<string, number>();

        for (const s of w.workout_sets) {
          volume += (s.weight * s.reps);
          sets += 1;
          const ex = s.exercises as any;
          if (ex) {
            const name = ex.name_es || ex.name_en;
            exMap.set(name, (exMap.get(name) || 0) + 1);
          }
        }

        const summary = Array.from(exMap.entries()).map(([name, count]) => \\x \\);
        const duration = w.end_time 
          ? Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000)
          : 0;

        return {
          id: w.id,
          start_time: w.start_time,
          end_time: w.end_time,
          duration_minutes: duration,
          total_volume: volume,
          total_sets: sets,
          exercises_summary: summary
        };
      });
      this.history.set(mapped);
    }
    this.isLoadingHistory.set(false);
  }
}
"""

with open("src/app/core/facades/workout.facade.ts", "w", encoding="utf-8") as f:
    f.write(content)

