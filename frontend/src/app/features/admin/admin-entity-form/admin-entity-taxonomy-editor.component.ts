import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminEntitiesApi,
  AdminEntityAliasKind,
  AdminEntityAliasRecord,
  AdminEntityTagRecord,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import { Tag, TagsApi } from '../../../core/api/tags.api';

export type AdminEntityTaxonomyState = {
  tags: AdminEntityTagRecord[];
  aliases: AdminEntityAliasRecord[];
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-taxonomy-editor',
  imports: [FormsModule],
  templateUrl: './admin-entity-taxonomy-editor.component.html',
  styleUrls: ['./admin-entity-taxonomy-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityTaxonomyEditorComponent implements OnInit, OnChanges {
  private readonly adminApi = inject(AdminEntitiesApi);
  private readonly tagsApi = inject(TagsApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input() tags: AdminEntityTagRecord[] = [];
  @Input() aliases: AdminEntityAliasRecord[] = [];
  @Output() stateChange = new EventEmitter<AdminEntityTaxonomyState>();

  availableTags: Tag[] = [];
  selectedTagId = '';
  newTagLabel = '';
  newTagCategory = '';
  tagsSaving = false;
  tagsMessage = '';
  tagsError = '';
  aliasesSaving = false;
  aliasesMessage = '';
  aliasesError = '';
  newAliasValue = '';
  newAliasLocale: AdminLocale | 'und' = 'und';
  newAliasKind: AdminEntityAliasKind = 'COMMON_NAME';
  readonly aliasKinds: Array<{ value: AdminEntityAliasKind; label: string }> = [
    { value: 'COMMON_NAME', label: 'Nombre común' },
    { value: 'ALTERNATE_TITLE', label: 'Título alternativo' },
    { value: 'TRANSLITERATION', label: 'Transliteración' },
    { value: 'MISSPELLING', label: 'Error común' },
    { value: 'NICKNAME', label: 'Apodo' },
    { value: 'SEARCH_HINT', label: 'Pista de búsqueda' },
  ];

  ngOnInit(): void {
    this.tagsApi.list().subscribe({
      next: (tags) => {
        this.availableTags = tags;
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableTags = [];
        this.cdr.markForCheck();
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tags']) this.tags = [...this.tags];
    if (changes['aliases']) this.aliases = [...this.aliases];
  }

  addSelectedTag(): void {
    if (!this.entityId || !this.selectedTagId || this.tagsSaving) return;
    this.startTagAction();
    this.tagsApi.addToEntity(this.entityId, this.selectedTagId).subscribe({
      next: (tag) => {
        this.tagsSaving = false;
        this.selectedTagId = '';
        this.upsertTag(tag);
        this.tagsMessage = 'Tag añadido.';
        this.emitState();
      },
      error: (error) => this.failTagAction(error, 'No se pudo añadir el tag.'),
    });
  }

  createTagAndAttach(): void {
    const label = this.newTagLabel.trim();
    if (!this.entityId || !label || this.tagsSaving) return;
    this.startTagAction();
    this.tagsApi.create({ label, category: this.newTagCategory.trim() || undefined }).subscribe({
      next: (tag) => {
        this.availableTags = [...this.availableTags, tag].sort((a, b) =>
          a.label.localeCompare(b.label),
        );
        this.newTagLabel = '';
        this.newTagCategory = '';
        this.tagsApi.addToEntity(this.entityId, tag.id).subscribe({
          next: (entityTag) => {
            this.tagsSaving = false;
            this.upsertTag(entityTag);
            this.tagsMessage = 'Tag creado y añadido.';
            this.emitState();
          },
          error: (error) =>
            this.failTagAction(error, 'Tag creado, pero no se pudo añadir a la entity.'),
        });
      },
      error: (error) => this.failTagAction(error, 'No se pudo crear el tag.'),
    });
  }

  removeTag(tagId: string): void {
    if (!this.entityId || this.tagsSaving) return;
    this.startTagAction();
    this.tagsApi.removeFromEntity(this.entityId, tagId).subscribe({
      next: () => {
        this.tagsSaving = false;
        this.tags = this.tags.filter(
          (entityTag) => entityTag.tagId !== tagId && entityTag.tag?.id !== tagId,
        );
        this.tagsMessage = 'Tag quitado.';
        this.emitState();
      },
      error: (error) => this.failTagAction(error, 'No se pudo quitar el tag.'),
    });
  }

  addAlias(): void {
    const value = this.newAliasValue.trim();
    if (!this.entityId || !value || this.aliasesSaving) return;
    this.aliasesSaving = true;
    this.aliasesMessage = '';
    this.aliasesError = '';
    this.adminApi
      .createAlias(this.entityId, {
        value,
        locale: this.newAliasLocale,
        kind: this.newAliasKind,
      })
      .subscribe({
        next: (entity) => {
          this.aliasesSaving = false;
          this.aliases = Array.isArray(entity.aliases) ? entity.aliases : [];
          this.newAliasValue = '';
          this.newAliasLocale = 'und';
          this.newAliasKind = 'COMMON_NAME';
          this.aliasesMessage = 'Alias añadido.';
          this.emitState();
        },
        error: (error) => {
          this.aliasesSaving = false;
          this.aliasesError = error?.error?.message ?? 'No se pudo añadir el alias.';
          this.cdr.markForCheck();
        },
      });
  }

  removeAlias(aliasId: string): void {
    if (!this.entityId || this.aliasesSaving) return;
    this.aliasesSaving = true;
    this.aliasesMessage = '';
    this.aliasesError = '';
    this.adminApi.deleteAlias(this.entityId, aliasId).subscribe({
      next: (entity) => {
        this.aliasesSaving = false;
        this.aliases = Array.isArray(entity.aliases) ? entity.aliases : [];
        this.aliasesMessage = 'Alias eliminado.';
        this.emitState();
      },
      error: (error) => {
        this.aliasesSaving = false;
        this.aliasesError = error?.error?.message ?? 'No se pudo eliminar el alias.';
        this.cdr.markForCheck();
      },
    });
  }

  entityTagId(tag: AdminEntityTagRecord): string | null {
    return tag.tagId ?? tag.tag?.id ?? null;
  }

  availableTagsToAttach(): Tag[] {
    return this.availableTags.filter(
      (tag) => tag.isActive && !this.tags.some((item) => this.entityTagId(item) === tag.id),
    );
  }

  aliasLocaleLabel(locale?: string | null): string {
    if (!locale || locale === 'und') return 'Global';
    return locale === 'es' ? 'ES' : locale === 'en' ? 'EN' : locale.toUpperCase();
  }

  aliasKindLabel(kind?: string | null): string {
    return this.aliasKinds.find((entry) => entry.value === kind)?.label ?? kind ?? 'Alias';
  }

  private startTagAction(): void {
    this.tagsSaving = true;
    this.tagsMessage = '';
    this.tagsError = '';
  }

  private failTagAction(error: { error?: { message?: string } } | null, fallback: string): void {
    this.tagsSaving = false;
    this.tagsError = error?.error?.message ?? fallback;
    this.cdr.markForCheck();
  }

  private upsertTag(tag: AdminEntityTagRecord): void {
    const tagId = this.entityTagId(tag);
    if (!tagId) return;
    const index = this.tags.findIndex((item) => this.entityTagId(item) === tagId);
    this.tags =
      index < 0 ? [...this.tags, tag] : this.tags.map((item, i) => (i === index ? tag : item));
  }

  private emitState(): void {
    this.stateChange.emit({ tags: [...this.tags], aliases: [...this.aliases] });
    this.cdr.markForCheck();
  }
}
