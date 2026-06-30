import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
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
  @Input() active = false;
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

  previewEntity: PublicEntityPreview | null = null;

  ngOnChanges(): void {
    if (!this.active || !this.ready || !this.form) {
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
