import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import {
  AdminEntityAliasRecord,
  AdminEntityDetailsPayload,
  AdminEntityResponse,
  AdminEntitySearchListItem,
  AdminEntityTagRecord,
  AdminEntitiesApi,
  AdminEntityPayload,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import {
  AdminEntityFormDraft,
  contentFieldHint,
  contentFieldLabel,
  summaryFieldHint,
} from './admin-entity-content.presenter';
import {
  detectAdminEntityLinkMatch,
  insertAdminEntityLink,
} from './admin-entity-content-linking.presenter';
import { AdminEntityDetailsEditorComponent } from './admin-entity-details-editor.component';
import { AdminEntityLinkSuggestionsComponent } from './admin-entity-link-suggestions.component';
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
    AdminEntityLinkSuggestionsComponent,
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
export class AdminEntityGlobalDataComponent implements OnInit, OnChanges, OnDestroy {
  private readonly api = inject(AdminEntitiesApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly linkSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  @ViewChild('contentTextarea') contentTextarea?: ElementRef<HTMLTextAreaElement>;

  @Input() active = false;
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
  readonly statuses: NonNullable<AdminEntityPayload['status']>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];
  readonly levels: NonNullable<AdminEntityPayload['contentLevel']>[] = [
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  linkSuggestions: AdminEntitySearchListItem[] = [];
  linkSearch = '';
  linkLoading = false;
  showLinkSuggestions = false;
  private linkStartIndex = -1;
  private slugTouched = false;

  ngOnInit(): void {
    this.linkSearch$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();
          if (!q) return of({ items: [] });
          this.linkLoading = true;
          this.cdr.markForCheck();
          return this.api.list({ q, limit: 8, page: 1, sort: 'title' });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.linkSuggestions = Array.isArray(response?.items) ? response.items : [];
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.linkSuggestions = [];
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
      });
  }

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
    if (changes['isEdit'] && this.isEdit) this.slugTouched = true;
  }

  onFormChange(): void {
    this.emitDraft();
  }

  onTitleChange(value: string): void {
    this.form.title = value;
    this.translations = {
      ...this.translations,
      es: { ...this.translations.es, title: value },
    };
    if (!this.slugTouched) this.form.slug = this.slugify(value);
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

  contentLabel(): string {
    return contentFieldLabel(this.form.type);
  }

  contentHint(): string {
    return contentFieldHint(this.form.type);
  }

  summaryHint(): string {
    return summaryFieldHint(this.form.type);
  }

  onContentInput(): void {
    this.emitDraft();
    const value = this.form.content ?? '';
    const textarea = this.contentTextarea?.nativeElement;
    if (!textarea) return this.closeLinkSuggestions();

    const linkMatch = detectAdminEntityLinkMatch(value, textarea.selectionStart ?? value.length);
    if (!linkMatch) return this.closeLinkSuggestions();

    this.linkStartIndex = linkMatch.startIndex;
    this.linkSearch = linkMatch.query;
    this.showLinkSuggestions = true;
    if (!linkMatch.query) {
      this.linkSuggestions = [];
      this.linkLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.linkSearch$.next(linkMatch.query);
  }

  insertEntityLink(entity: AdminEntitySearchListItem): void {
    const textarea = this.contentTextarea?.nativeElement;
    const value = this.form.content ?? '';
    if (!textarea || this.linkStartIndex < 0) return;

    const inserted = insertAdminEntityLink(
      value,
      this.linkStartIndex,
      textarea.selectionStart ?? value.length,
      entity,
    );
    this.form.content = inserted.value;
    this.emitDraft();
    this.closeLinkSuggestions();
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(inserted.cursor, inserted.cursor);
    });
  }

  closeLinkSuggestions(): void {
    this.linkSuggestions = [];
    this.linkSearch = '';
    this.linkLoading = false;
    this.showLinkSuggestions = false;
    this.linkStartIndex = -1;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
