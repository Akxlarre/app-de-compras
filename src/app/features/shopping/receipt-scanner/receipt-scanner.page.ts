import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceiptScannerFacade } from '@core/facades/receipt-scanner.facade';
import { AppHeaderComponent } from '@shared/components/app-header/app-header.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { Router } from '@angular/router';

@Component({
  selector: 'app-receipt-scanner-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppHeaderComponent,
    IconComponent,
    PressFeedbackDirective
  ],
  template: `
    <div class="h-full flex flex-col bg-base">
      <app-header title="Escanear Boleta" />

      <main class="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col relative">
        <div class="bento-grid flex-1">
          
          @if (facade.scannedItems().length === 0 && !facade.isScanning()) {
            
            <!-- Estado Inicial: Subir foto -->
            <div class="bento-wide h-full flex flex-col items-center justify-center min-h-[400px]">
              <div 
                class="w-full max-w-sm aspect-[3/4] border-2 border-dashed border-border-default rounded-2xl flex flex-col items-center justify-center bg-surface cursor-pointer hover:border-brand transition-colors relative overflow-hidden"
                [class.border-brand]="isDragging()"
                [class.bg-brand-muted]="isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
                [appPressFeedback]="'highlight'"
              >
                
                @if (selectedImagePreview()) {
                  <img [src]="selectedImagePreview()" class="absolute inset-0 w-full h-full object-cover opacity-30" />
                }
                
                <div class="z-10 flex flex-col items-center text-center p-6">
                  <div class="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                    <app-icon name="camera" [size]="32" class="text-brand" />
                  </div>
                  <h3 class="text-lg font-bold text-primary mb-2">Sube tu boleta</h3>
                  <p class="text-sm text-muted">Toma una foto de tu ticket de compra para extraer los precios automáticamente.</p>
                </div>
              </div>

              <input 
                #fileInput 
                type="file" 
                accept="image/*" 
                capture="environment" 
                class="hidden" 
                (change)="onFileSelected($event)"
              />
            </div>

          } @else if (facade.isScanning()) {
            
            <!-- Estado Escaneando -->
            <div class="bento-wide h-full flex flex-col items-center justify-center min-h-[400px]">
              <app-icon name="loader-2" [size]="48" class="text-brand animate-spin mb-6" />
              <h3 class="text-xl font-bold text-primary mb-2">Analizando boleta...</h3>
              <p class="text-sm text-muted">La IA está extrayendo los productos y sus precios.</p>
            </div>

          } @else {
            
            <!-- Resultados -->
            <div class="bento-wide card-accent flex flex-col gap-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-bold text-primary">Precios detectados</h2>
                <button 
                  class="p-2 bg-surface rounded-full text-muted hover:text-primary transition-colors"
                  (click)="cancel()"
                >
                  <app-icon name="x" [size]="20" />
                </button>
              </div>

              <div class="flex flex-col gap-3">
                @for (item of facade.scannedItems(); track item.id) {
                  <div class="flex items-center justify-between p-3 bg-surface border border-border-default rounded-xl">
                    <span class="font-medium text-primary">{{ item.name }}</span>
                    <span class="font-bold text-brand">\${{ item.price | number:'1.0-0' }}</span>
                  </div>
                }
              </div>

              <div class="mt-4 pt-4 border-t border-border-subtle flex flex-col gap-3">
                <button 
                  class="btn-primary w-full"
                  [disabled]="facade.isSaving()"
                  (click)="savePrices()"
                  [appPressFeedback]="'press'"
                >
                  @if (facade.isSaving()) {
                    <app-icon name="loader-2" [size]="18" class="animate-spin" /> Guardando...
                  } @else {
                    <app-icon name="check" [size]="18" /> Guardar Precios
                  }
                </button>
              </div>
            </div>

          }

          @if (facade.error()) {
            <div class="bento-wide bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl mt-4 flex items-start gap-3">
              <app-icon name="alert-circle" [size]="20" class="shrink-0 mt-0.5" />
              <span class="text-sm">{{ facade.error() }}</span>
            </div>
          }

        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptScannerPage implements OnDestroy {
  public facade = inject(ReceiptScannerFacade);
  private router = inject(Router);

  public isDragging = signal(false);
  public selectedImagePreview = signal<string | null>(null);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    // Crear preview visual
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Procesar con Facade
    this.facade.processReceiptImage(file);
  }

  async savePrices() {
    try {
      await this.facade.confirmAndSavePrices(this.facade.scannedItems());
      this.selectedImagePreview.set(null);
      this.router.navigate(['/app/active']);
    } catch (e) {
      // El error ya lo maneja la facade internamente para la UI
    }
  }

  cancel() {
    this.selectedImagePreview.set(null);
    this.facade.reset();
  }

  ngOnDestroy() {
    this.facade.reset();
  }
}
