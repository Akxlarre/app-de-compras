import os

filepath = 'src/app/features/explorer/explorer.page.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_html = """    <ion-header class="ion-no-border" style="background: transparent;">
      <app-header title="Catálogo de Ejercicios"></app-header>
      <div class="search-container">
        <ion-searchbar 
          class="custom-searchbar"
          placeholder="Buscar ejercicio..."
          [debounce]="250"
          (ionInput)="onSearch()">
        </ion-searchbar>
      </div>
    </ion-header>
    
    <ion-content class="explorer-content" [fullscreen]="true">"""

new_html = """    <ion-content class="explorer-content" [fullscreen]="true">
      <app-header title="Catálogo de Ejercicios">
        <div slot="bottom" class="search-container" style="padding-top: 1rem; padding-bottom: 0;">
          <ion-searchbar 
            class="custom-searchbar"
            placeholder="Buscar ejercicio..."
            [debounce]="250"
            (ionInput)="onSearch()">
          </ion-searchbar>
        </div>
      </app-header>"""

content = content.replace(old_html, new_html)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
