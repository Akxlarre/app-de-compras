import os

filepath = 'src/app/features/profile/profile.page.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the duplicated block and remove it.
# The template ends at </ion-content>\n  ,
# I will just write a regex or string replacement.

start_str = "      <div class=\"page-container\">\n        @if (auth.currentUser(); as user) {"
end_str = "        }\n      }\n      <div class=\"page-container\">"

# Actually, the diff showed:
#       }
#+      <div class="page-container">
#+        @if (auth.currentUser(); as user) {
# ...
#+        }
#+      </div>
#     </ion-content>

content = content.replace('''      <div class="page-container">
        @if (auth.currentUser(); as user) {
          <div class="profile-hero">
            <div class="avatar">
              {{ user.initials }}
            </div>
            <h2 class="user-name">{{ user.name }}</h2>
            <p class="user-email">{{ user.email }}</p>
          </div>
          
          <div class="options-section">
            <p class="section-label">OPCIONES</p>
            <ion-list class="options-list">
              <ion-item button detail="false" lines="none" class="option-item">
                <ion-icon name="settings-outline" slot="start" class="option-icon"></ion-icon>
                <ion-label>Preferencias</ion-label>
                <ion-icon name="chevron-forward-outline" slot="end" class="chevron-icon"></ion-icon>
              </ion-item>
            </ion-list>
          </div>

          <div class="logout-section">
            <button class="logout-btn" (click)="logout()">
              <ion-icon name="log-out-outline"></ion-icon>
              Cerrar Sesión
            </button>
          </div>
        } @else {
          <div class="empty-state">
            <p>No has iniciado sesión.</p>
          </div>
        }
      </div>''', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
