# -*- coding: utf-8 -*-
import os

filepath = "src/app/features/workouts/active-workout/active-workout.page.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "import { \n  IonHeader", 
    "import { AlertController } from '@ionic/angular';\nimport { \n  IonHeader"
)

content = content.replace(
    """<button class="finish-btn" (click)="facade.finishWorkout()">""",
    """<button class="finish-btn" (click)="confirmFinishWorkout()">"""
)

class_methods = """
  alertCtrl = inject(AlertController);

  async confirmFinishWorkout() {
    const session = this.facade.activeSession();
    if (!session) return;
    
    let hasCompletedSets = false;
    for (const ex of session.exercises) {
      if (ex.sets.some(s => s.completed)) {
        hasCompletedSets = true;
        break;
      }
    }

    if (!hasCompletedSets) {
      const alert = await this.alertCtrl.create({
        header: 'Entrenamiento Vacío',
        message: 'No has completado ninguna serie. ¿Deseas descartar este entrenamiento?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { 
            text: 'Descartar', 
            role: 'destructive',
            handler: () => {
              this.facade.discardWorkout();
            }
          }
        ],
        cssClass: 'dark-alert'
      });
      await alert.present();
    } else {
      await this.facade.finishWorkout();
    }
  }

  async confirmRemoveExercise(exerciseId: string, exerciseName: string) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Ejercicio',
      message: ¿Quitar  de tu rutina actual?,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar', 
          role: 'destructive',
          handler: () => this.facade.removeExercise(exerciseId)
        }
      ],
      cssClass: 'dark-alert'
    });
    await alert.present();
  }
"""

content = content.replace(
    "facade = inject(WorkoutFacade);",
    "facade = inject(WorkoutFacade);\n" + class_methods
)

# Add "Eliminar" button in the exercise header
# <div class="exercise-header">
#   <span class="exercise-emoji">???</span>
#   <h3 class="exercise-title">{{ ex.exercise_name }}</h3>
# </div>
header_replacement = """<div class="exercise-header">
                <div style="display:flex; align-items:center; gap: 0.5rem">
                  <span class="exercise-emoji">???</span>
                  <h3 class="exercise-title">{{ ex.exercise_name }}</h3>
                </div>
                <button class="delete-ex-btn" (click)="confirmRemoveExercise(ex.exercise_id, ex.exercise_name)">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>"""
content = content.replace("""<div class="exercise-header">
                <span class="exercise-emoji">???</span>
                <h3 class="exercise-title">{{ ex.exercise_name }}</h3>
              </div>""", header_replacement)

# Add CSS for .delete-ex-btn
css_replacement = """
    .delete-ex-btn {
      background: transparent;
      color: rgba(255, 255, 255, 0.3);
      font-size: 1.2rem;
      padding: 0.2rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .delete-ex-btn:active { background: rgba(255, 0, 0, 0.1); color: #ef4444; }
    """
content = content.replace("/* === INPUTS === */", css_replacement + "\n    /* === INPUTS === */")


with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

