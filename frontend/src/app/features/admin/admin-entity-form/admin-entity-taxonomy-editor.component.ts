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
  AdminEntityClassificationRecord,
  AdminEntityTagRecord,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import { Tag, TagsApi } from '../../../core/api/tags.api';
import { Taxonomy, TaxonomiesApi } from '../../../core/api/taxonomies.api';

export type AdminEntityTaxonomyState = {
  tags: AdminEntityTagRecord[];
  classifications: AdminEntityClassificationRecord[];
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
  private readonly taxonomiesApi = inject(TaxonomiesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input() tags: AdminEntityTagRecord[] = [];
  @Input() classifications: AdminEntityClassificationRecord[] = [];
  @Input() aliases: AdminEntityAliasRecord[] = [];
  @Output() stateChange = new EventEmitter<AdminEntityTaxonomyState>();

  availableTags: Tag[] = [];
  taxonomies: Taxonomy[] = [];
  selectedTaxonomyKey = '';
  selectedTermId = '';
  newTaxonomyKey = '';
  newTaxonomyLabel = '';
  newTermKey = '';
  newTermLabel = '';
  taxonomySaving = false;
  taxonomyMessage = '';
  taxonomyError = '';
  classificationsSaving = false;
  classificationsMessage = '';
  classificationsError = '';
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
    this.taxonomiesApi.list().subscribe({
      next: (taxonomies) => {
        this.taxonomies = taxonomies;
        this.cdr.markForCheck();
      },
      error: () => {
        this.taxonomies = [];
        this.cdr.markForCheck();
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tags']) this.tags = [...this.tags];
    if (changes['classifications']) this.classifications = [...this.classifications];
    if (changes['aliases']) this.aliases = [...this.aliases];
  }

  createTaxonomy(): void {
    const key = this.newTaxonomyKey.trim();
    const label = this.newTaxonomyLabel.trim();
    if (!key || !label || this.taxonomySaving) return;

    this.taxonomySaving = true;
    this.taxonomyMessage = '';
    this.taxonomyError = '';
    this.taxonomiesApi.create({ key, label }).subscribe({
      next: (taxonomy) => {
        this.taxonomies = [...this.taxonomies, { ...taxonomy, terms: [] }].sort((a, b) =>
          a.label.localeCompare(b.label),
        );
        this.selectedTaxonomyKey = taxonomy.key;
        this.newTaxonomyKey = '';
        this.newTaxonomyLabel = '';
        this.taxonomySaving = false;
        this.taxonomyMessage = 'Taxonomía creada.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.taxonomySaving = false;
        this.taxonomyError = error?.error?.message ?? 'No se pudo crear la taxonomía.';
        this.cdr.markForCheck();
      },
    });
  }

  createTerm(): void {
    const key = this.newTermKey.trim();
    const label = this.newTermLabel.trim();
    if (!this.selectedTaxonomyKey || !key || !label || this.taxonomySaving) return;

    this.taxonomySaving = true;
    this.taxonomyMessage = '';
    this.taxonomyError = '';
    this.taxonomiesApi.createTerm(this.selectedTaxonomyKey, { key, label }).subscribe({
      next: (term) => {
        this.taxonomies = this.taxonomies.map((taxonomy) =>
          taxonomy.key !== this.selectedTaxonomyKey
            ? taxonomy
            : {
                ...taxonomy,
                terms: [...taxonomy.terms, term].sort((a, b) => a.label.localeCompare(b.label)),
              },
        );
        this.selectedTermId = term.id;
        this.newTermKey = '';
        this.newTermLabel = '';
        this.taxonomySaving = false;
        this.taxonomyMessage = 'Término creado.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.taxonomySaving = false;
        this.taxonomyError = error?.error?.message ?? 'No se pudo crear el término.';
        this.cdr.markForCheck();
      },
    });
  }

  addClassification(): void {
    if (!this.entityId || !this.selectedTermId || this.classificationsSaving) return;
    this.classificationsSaving = true;
    this.classificationsMessage = '';
    this.classificationsError = '';
    this.adminApi.addClassification(this.entityId, { termId: this.selectedTermId }).subscribe({
      next: (classification) => {
        this.classificationsSaving = false;
        this.classifications = [
          ...this.classifications.filter(
            (item) => this.classificationTermId(item) !== this.selectedTermId,
          ),
          classification,
        ];
        this.selectedTermId = '';
        this.classificationsMessage = 'Clasificación añadida.';
        this.emitState();
      },
      error: (error) => {
        this.classificationsSaving = false;
        this.classificationsError = error?.error?.message ?? 'No se pudo añadir la clasificación.';
        this.cdr.markForCheck();
      },
    });
  }

  removeClassification(termId: string): void {
    if (!this.entityId || this.classificationsSaving) return;
    this.classificationsSaving = true;
    this.classificationsMessage = '';
    this.classificationsError = '';
    this.adminApi.removeClassification(this.entityId, termId).subscribe({
      next: () => {
        this.classificationsSaving = false;
        this.classifications = this.classifications.filter(
          (item) => this.classificationTermId(item) !== termId,
        );
        this.classificationsMessage = 'Clasificación eliminada.';
        this.emitState();
      },
      error: (error) => {
        this.classificationsSaving = false;
        this.classificationsError =
          error?.error?.message ?? 'No se pudo eliminar la clasificación.';
        this.cdr.markForCheck();
      },
    });
  }

  availableTerms(): Taxonomy['terms'] {
    return (
      this.taxonomies.find((taxonomy) => taxonomy.key === this.selectedTaxonomyKey)?.terms ?? []
    ).filter(
      (term) => !this.classifications.some((item) => this.classificationTermId(item) === term.id),
    );
  }

  classificationTermId(classification: AdminEntityClassificationRecord): string | null {
    return classification.term?.id ?? null;
  }

  classificationLabel(classification: AdminEntityClassificationRecord): string {
    const taxonomy = classification.term?.taxonomy?.label;
    const term = classification.term?.label ?? classification.term?.key ?? 'Clasificación';
    return taxonomy ? taxonomy + ' · ' + term : term;
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
    this.stateChange.emit({
      tags: [...this.tags],
      classifications: [...this.classifications],
      aliases: [...this.aliases],
    });
    this.cdr.markForCheck();
  }
}
