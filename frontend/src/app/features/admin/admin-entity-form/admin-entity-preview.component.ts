import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import {
  AdminEntityDetailsPayload,
  AdminEntityRelationRecord,
  AdminEntityTagRecord,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import { PublicEntityPreview } from '../../../core/api/entities.models';
import { EntityDetailViewComponent } from '../../entity/entity-detail-view.component';
import {
  AdminEntityPreviewForm,
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewSourceRef,
  AdminEntityPreviewTranslationForm,
  buildAdminEntityPublicationChecks,
  buildAdminEntityPreviewModel,
} from './admin-entity-preview.presenter';
import { AdminEditableContributor } from './admin-entity-metadata.presenter';
import { EditableAdminMediaEditor } from './media-admin.models';
import { VisualSlot } from './admin-entity-media.presenter';

@Component({
  standalone: true,
  selector: 'app-admin-entity-preview',
  imports: [EntityDetailViewComponent],
  templateUrl: './admin-entity-preview.component.html',
  styleUrls: ['./admin-entity-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityPreviewComponent implements OnChanges {
  @Input() ready = false;
  @Input() stateKey = '';
  @Input() entityId = '';
  @Input() locale: AdminLocale = 'es';
  @Input({ required: true }) form!: AdminEntityPreviewForm;
  @Input({ required: true }) translations!: Record<AdminLocale, AdminEntityPreviewTranslationForm>;
  @Input({ required: true }) details!: AdminEntityDetailsPayload;
  @Input({ required: true }) localizedDetails!: Record<
    AdminLocale,
    AdminEntityPreviewLocalizedDetailsForm
  >;
  @Input() entityTags: AdminEntityTagRecord[] = [];
  @Input() relations: AdminEntityRelationRecord[] = [];
  @Input() incomingRelations: AdminEntityRelationRecord[] = [];
  @Input() sourceRefs: AdminEntityPreviewSourceRef[] = [];
  @Input() contributors: AdminEditableContributor[] = [];
  @Input() mediaEditors: EditableAdminMediaEditor[] = [];
  @Input() persistedResolvedMedia: Record<string, unknown> | null = null;
  @Input() resolvedVisualSlots: VisualSlot[] = [];
  @Input() publishing = false;
  @Output() publish = new EventEmitter<void>();

  previewEntity: PublicEntityPreview | null = null;

  get publicationChecks() {
    const translations = Object.values(this.translations ?? {});
    return buildAdminEntityPublicationChecks({
      hasTitle:
        translations.some((translation) => !!translation.title.trim()) || !!this.form.title.trim(),
      hasNarrative:
        translations.some(
          (translation) => !!translation.shortDescription.trim() || !!translation.essay.trim(),
        ) ||
        !!this.form.summary.trim() ||
        !!this.form.content.trim(),
      mediaCount: this.mediaEditors.length,
      sourcesCount: this.sourceRefs.length,
      relationsCount: this.relations.length + this.incomingRelations.length,
      translationCount: translations.filter((translation) => !!translation.title.trim()).length,
      totalTranslations: translations.length,
    });
  }

  get publicationReadyCount(): number {
    return this.publicationChecks.filter((check) => check.done).length;
  }

  get isPublished(): boolean {
    return this.form.status === 'PUBLISHED';
  }

  get statusLabel(): string {
    if (this.isPublished) return 'Publicada';
    return this.form.status === 'IN_REVIEW' ? 'En revisión' : 'Borrador';
  }

  ngOnChanges(): void {
    if (!this.ready || !this.form) {
      this.previewEntity = null;
      return;
    }

    this.previewEntity = buildAdminEntityPreviewModel({
      entityId: this.entityId,
      locale: this.locale,
      form: this.form,
      translations: this.translations,
      details: this.details,
      localizedDetails: this.localizedDetails,
      entityTags: this.entityTags,
      relations: this.relations,
      incomingRelations: this.incomingRelations,
      sourceRefs: this.sourceRefs,
      contributors: this.contributors,
      mediaEditors: this.mediaEditors,
      persistedResolvedMedia: this.persistedResolvedMedia,
      resolvedVisualSlots: this.resolvedVisualSlots,
      toNullableNumber: (value) => this.toNullableNumber(value),
    });
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
