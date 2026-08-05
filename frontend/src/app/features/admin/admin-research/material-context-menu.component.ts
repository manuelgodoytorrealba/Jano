import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type MaterialMenuState = { materialId: string; title: string; x: number; y: number };

@Component({
  standalone: true,
  selector: 'app-material-context-menu',
  template: `
    <div
      class="material-menu"
      role="menu"
      [style.left.px]="x"
      [style.top.px]="y"
      [attr.aria-label]="'Acciones para ' + title"
    >
      <p>{{ title }}</p>
      @if (showRemoveFromResearch) {
        <button type="button" role="menuitem" (click)="removeFromResearch.emit()">
          Quitar de esta investigación
        </button>
      }
      <button
        class="material-menu__danger"
        type="button"
        role="menuitem"
        (click)="deleteFromLibrary.emit()"
      >
        Eliminar de Biblioteca
      </button>
    </div>
  `,
  styles: `
    .material-menu {
      position: fixed;
      z-index: 1000;
      width: 216px;
      padding: 6px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
      background: rgba(24, 23, 28, 0.98);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(18px);
    }

    p {
      margin: 0;
      padding: 7px 9px 8px;
      overflow: hidden;
      color: rgba(242, 238, 232, 0.52);
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    button {
      width: 100%;
      padding: 9px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: rgba(247, 244, 238, 0.92);
      text-align: left;
    }

    button:hover,
    button:focus-visible {
      background: rgba(255, 255, 255, 0.08);
    }

    button.material-menu__danger {
      color: #f3a6a6;
    }

    button.material-menu__danger:hover,
    button.material-menu__danger:focus-visible {
      background: rgba(210, 74, 74, 0.14);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialContextMenuComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) x = 0;
  @Input({ required: true }) y = 0;
  @Input() showRemoveFromResearch = false;
  @Output() readonly removeFromResearch = new EventEmitter<void>();
  @Output() readonly deleteFromLibrary = new EventEmitter<void>();
}
