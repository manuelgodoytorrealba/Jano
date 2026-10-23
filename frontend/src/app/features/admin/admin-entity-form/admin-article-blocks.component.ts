import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminEntitiesApi, AdminMediaAsset } from '../../../core/api/admin-entities.api';
import {
  ArticleBlock,
  articleImageUrl,
  parseArticleBlocks,
  serializeArticleBlocks,
} from '../../../shared/article-blocks';

@Component({
  selector: 'app-admin-article-blocks',
  standalone: true,
  imports: [FormsModule],
  template: ` <div class="article-editor">
    <p>
      Cada bloque es un párrafo con una imagen opcional. Conserva los enlaces a entidades con
      [[slug|texto]]. Guarda con el botón de la traducción.
    </p>
    @if (error) {
      <p role="alert">{{ error }}</p>
    }
    @for (block of blocks; track block; let index = $index) {
      <section class="block">
        <header>
          <strong>Párrafo {{ index + 1 }}</strong>
          <div>
            <button type="button" [disabled]="index === 0 || uploading" (click)="move(index, -1)">
              ↑ Subir
            </button>
            <button
              type="button"
              [disabled]="index === blocks.length - 1 || uploading"
              (click)="move(index, 1)"
            >
              ↓ Bajar
            </button>
            <button type="button" [disabled]="uploading" (click)="remove(index)">
              Quitar bloque
            </button>
          </div>
        </header>
        <label
          >Texto<textarea
            rows="5"
            [ngModel]="block.text"
            (ngModelChange)="block.text = $event; emit()"
            [ngModelOptions]="{ standalone: true }"
          ></textarea>
        </label>
        <div class="image-fields">
          <div>
            <label
              >Imagen de la biblioteca<select
                [ngModel]="block.imageUrl"
                (ngModelChange)="block.imageUrl = $event; emit()"
                [ngModelOptions]="{ standalone: true }"
              >
                <option value="">Sin imagen</option>
                @for (asset of assets; track asset.id) {
                  <option [value]="asset.url">
                    {{ asset.alt || asset.originalFilename || asset.url }}
                  </option>
                }
              </select></label
            >
            <label
              >O URL de imagen<input
                type="text"
                [ngModel]="block.imageUrl"
                (ngModelChange)="setUrl(block, $event)"
                [ngModelOptions]="{ standalone: true }"
                placeholder="https://… o /uploads/…"
            /></label>
            <label
              >Pie de imagen y crédito<input
                type="text"
                [ngModel]="block.caption"
                (ngModelChange)="block.caption = $event; emit()"
                [ngModelOptions]="{ standalone: true }"
            /></label>
            <label
              >Subir imagen<input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                [disabled]="!entityId || uploading"
                (change)="upload(block, $event)"
            /></label>
            @if (!entityId) {
              <small>Guarda primero el artículo para subir imágenes.</small>
            }
            @if (block.imageUrl) {
              <button type="button" (click)="block.imageUrl = ''; emit()">
                Quitar imagen del párrafo
              </button>
            }
          </div>
          @if (block.imageUrl) {
            <img [src]="block.imageUrl" [alt]="block.caption" />
          }
        </div>
      </section>
    }
    <button type="button" [disabled]="uploading" (click)="add()">+ Añadir párrafo</button>
    @if (uploading) {
      <p role="status">Subiendo imagen…</p>
    }
  </div>`,
  styleUrl: './admin-article-blocks.component.scss',
})
export class AdminArticleBlocksComponent implements OnChanges {
  private readonly api = inject(AdminEntitiesApi);
  private readonly cdr = inject(ChangeDetectorRef);
  @Input() content = '';
  @Input() entityId = '';
  @Output() contentChange = new EventEmitter<string>();
  blocks: ArticleBlock[] = [];
  assets: AdminMediaAsset[] = [];
  error = '';
  uploading = false;
  private loadedId = '';
  ngOnChanges(): void {
    if (this.content !== serializeArticleBlocks(this.blocks))
      this.blocks = parseArticleBlocks(this.content);
    if (!this.blocks.length) this.add();
    if (this.entityId && this.loadedId !== this.entityId) {
      this.loadedId = this.entityId;
      this.api.getById(this.entityId).subscribe({
        next: (entity) => {
          this.assets = entity.mediaLibrary?.assets ?? [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.error =
            'No se pudo cargar la biblioteca. Puedes usar una URL o volver a abrir el artículo.';
          this.cdr.markForCheck();
        },
      });
    }
  }
  add(): void {
    this.blocks.push({ text: '', imageUrl: '', caption: '' });
  }
  remove(index: number): void {
    this.blocks.splice(index, 1);
    this.emit();
  }
  move(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0 || target >= this.blocks.length) return;
    [this.blocks[index], this.blocks[target]] = [this.blocks[target], this.blocks[index]];
    this.emit();
  }
  setUrl(block: ArticleBlock, url: string): void {
    block.imageUrl = url;
    this.error =
      url && !articleImageUrl(url) ? 'Usa una URL http/https o una imagen de /uploads/.' : '';
    if (!this.error) this.emit();
  }
  emit(): void {
    if (this.blocks.some((block) => block.imageUrl && !articleImageUrl(block.imageUrl))) {
      this.error = 'Revisa las URL de las imágenes antes de guardar.';
      return;
    }
    this.contentChange.emit(serializeArticleBlocks(this.blocks));
  }
  upload(block: ArticleBlock, event: Event): void {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file || !this.entityId || this.uploading) return;
    if (file.size > 15 * 1024 * 1024) {
      this.error = 'La imagen no puede superar 15 MB.';
      return;
    }
    this.uploading = true;
    this.error = '';
    const previous = new Set(this.assets.map((asset) => asset.id));
    this.api
      .uploadMedia(this.entityId, file, { role: 'GALLERY', isPrimary: false, alt: block.caption })
      .subscribe({
        next: (entity) => {
          const assets = entity.mediaLibrary?.assets ?? [];
          const added =
            assets.find(
              (asset) => !previous.has(asset.id) && asset.originalFilename === file.name,
            ) ?? assets.find((asset) => !previous.has(asset.id));
          this.assets = assets;
          this.uploading = false;
          input.value = '';
          if (added && this.blocks.includes(block)) {
            block.imageUrl = added.url;
            this.emit();
          } else
            this.error = 'Imagen subida a la biblioteca. Selecciónala para asociarla al párrafo.';
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploading = false;
          this.error = 'No se pudo subir la imagen. Comprueba su formato y vuelve a intentarlo.';
          this.cdr.markForCheck();
        },
      });
  }
}
