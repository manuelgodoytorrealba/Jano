import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminEntityAliasRecord,
  AdminEntityDetailsPayload,
  AdminEntityResponse,
  AdminEntityTagRecord,
  AdminEntityPayload,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import { AdminEntityFormDraft } from './admin-entity-content.presenter';
import { AdminEntityDetailsEditorComponent } from './admin-entity-details-editor.component';
import {
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewTranslationForm,
} from './admin-entity-preview.presenter';
import {
  AdminEntityTaxonomyEditorComponent,
  AdminEntityTaxonomyState,
} from './admin-entity-taxonomy-editor.component';
import {
  AdminEntityTranslationDraftState,
  AdminEntityTranslationEditorComponent,
} from './admin-entity-translation-editor.component';

export type AdminEntityGlobalDataDraft = {
  form: AdminEntityFormDraft;
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>;
  localizedDetails: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm>;
  details: AdminEntityDetailsPayload;
  tags: AdminEntityTagRecord[];
  aliases: AdminEntityAliasRecord[];
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-global-data',
  imports: [
    FormsModule,
    AdminEntityTranslationEditorComponent,
    AdminEntityTaxonomyEditorComponent,
    AdminEntityDetailsEditorComponent,
  ],
  templateUrl: './admin-entity-global-data.component.html',
  styleUrls: [
    './admin-entity-metadata-editor.component.scss',
    './admin-entity-global-data.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityGlobalDataComponent implements OnChanges {
  @Input() isEdit = false;
  @Input() entityId = '';
  @Input({ required: true }) form: AdminEntityFormDraft = {
    type: 'ARTWORK',
    title: '',
    slug: '',
    summary: '',
    content: '',
    contentLevel: '',
    status: 'DRAFT',
    startYear: null,
    endYear: null,
  };
  @Input({ required: true }) translations!: Record<AdminLocale, AdminEntityPreviewTranslationForm>;
  @Input({ required: true }) localizedDetails!: Record<
    AdminLocale,
    AdminEntityPreviewLocalizedDetailsForm
  >;
  @Input() details: AdminEntityDetailsPayload = {};
  @Input() tags: AdminEntityTagRecord[] = [];
  @Input() aliases: AdminEntityAliasRecord[] = [];

  @Output() draftChange = new EventEmitter<AdminEntityGlobalDataDraft>();
  @Output() translationSaved = new EventEmitter<AdminEntityResponse>();
  @Output() detailsSaved = new EventEmitter<AdminEntityResponse>();
  @Output() detailsStatusChange = new EventEmitter<{ saving: boolean; error: string }>();

  readonly types: AdminEntityPayload['type'][] = [
    'ARTWORK',
    'ARTIST',
    'ARTICLE',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];
  readonly statuses: NonNullable<AdminEntityPayload['status']>[] = ['DRAFT', 'IN_REVIEW'];
  readonly levels: NonNullable<AdminEntityPayload['contentLevel']>[] = [
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  private slugTouched = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form']) this.form = { ...this.form };
    if (changes['details']) this.details = { ...this.details };
    if (changes['tags']) this.tags = [...this.tags];
    if (changes['aliases']) this.aliases = [...this.aliases];
    if (changes['translations']) {
      this.translations = {
        es: { ...this.translations.es },
        en: { ...this.translations.en },
      };
    }
    if (changes['localizedDetails']) {
      this.localizedDetails = {
        es: { ...this.localizedDetails.es },
        en: { ...this.localizedDetails.en },
      };
    }
    if (changes['isEdit'] && this.isEdit) {
      this.slugTouched = !this.form.slug.startsWith('_draft-');
    }
  }

  onFormChange(): void {
    this.emitDraft();
  }

  onSlugChange(value: string): void {
    this.slugTouched = true;
    this.form.slug = this.slugify(value);
    this.emitDraft();
  }

  onTranslationDraftChange(state: AdminEntityTranslationDraftState): void {
    this.translations = state.translations;
    this.localizedDetails = state.localizedDetails;
    this.details = state.details;
    const spanish = state.translations.es;
    this.form = {
      ...this.form,
      title: spanish.title,
      summary: spanish.shortDescription || spanish.excerpt,
      content: spanish.essay,
      slug: !this.slugTouched && spanish.title ? this.slugify(spanish.title) : this.form.slug,
    };
    this.emitDraft();
  }

  onTaxonomyStateChange(state: AdminEntityTaxonomyState): void {
    this.tags = state.tags;
    this.aliases = state.aliases;
    this.emitDraft();
  }

  onDetailsChange(details: AdminEntityDetailsPayload): void {
    this.details = details;
    this.emitDraft();
  }

  supportsTypedDetails(): boolean {
    return ['ARTWORK', 'ARTIST', 'CONCEPT', 'PERIOD'].includes(this.form.type);
  }

  private emitDraft(): void {
    this.draftChange.emit({
      form: { ...this.form },
      translations: {
        es: { ...this.translations.es },
        en: { ...this.translations.en },
      },
      localizedDetails: {
        es: { ...this.localizedDetails.es },
        en: { ...this.localizedDetails.en },
      },
      details: { ...this.details },
      tags: [...this.tags],
      aliases: [...this.aliases],
    });
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
