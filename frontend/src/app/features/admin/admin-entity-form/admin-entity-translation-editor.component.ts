import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RichTextComponent } from '../../../shared/rich-text/rich-text.component';
import {
  AdminEntityDetailsPayload,
  AdminEntityPayload,
  AdminEntityResponse,
  AdminLocale,
} from '../../../core/api/admin-entities.api';
import {
  AdminEntityPreviewLocalizedDetailsForm,
  AdminEntityPreviewTranslationForm,
} from './admin-entity-preview.presenter';
import {
  buildTranslationPayload,
  createEmptyLocalizedDetailsForm,
  createEmptyTranslationForm,
  translationStatus,
  translationStatusLabel,
  translationStatusMark,
} from './admin-entity-content.presenter';
import { AdminEntityFormFacade } from './admin-entity-form.facade';

export type AdminEntityTranslationDraftState = {
  translations: Record<AdminLocale, AdminEntityPreviewTranslationForm>;
  localizedDetails: Record<AdminLocale, AdminEntityPreviewLocalizedDetailsForm>;
  details: AdminEntityDetailsPayload;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-translation-editor',
  imports: [FormsModule, RichTextComponent],
  templateUrl: './admin-entity-translation-editor.component.html',
  styleUrls: ['./admin-entity-translation-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityTranslationEditorComponent implements OnChanges {
  private readonly facade = inject(AdminEntityFormFacade);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Input({ required: true }) entityType: AdminEntityPayload['type'] = 'ARTWORK';
  @Input({ required: true }) translations: Record<AdminLocale, AdminEntityPreviewTranslationForm> =
    {
      es: createEmptyTranslationForm(),
      en: createEmptyTranslationForm(),
    };
  @Input({ required: true }) localizedDetails: Record<
    AdminLocale,
    AdminEntityPreviewLocalizedDetailsForm
  > = {
    es: createEmptyLocalizedDetailsForm(),
    en: createEmptyLocalizedDetailsForm(),
  };
  @Input({ required: true }) details: AdminEntityDetailsPayload = {};

  @Output() draftChange = new EventEmitter<AdminEntityTranslationDraftState>();
  @Output() saved = new EventEmitter<AdminEntityResponse>();

  readonly locales: Array<{ locale: AdminLocale; label: string }> = [
    { locale: 'es', label: 'Español' },
    { locale: 'en', label: 'English' },
  ];
  activeLocale: AdminLocale = 'es';
  essayEditorContent = '';
  essayEditorVersion = 0;
  private editingEssay = false;

  get saving(): boolean {
    return this.facade.translationSaving();
  }

  get message(): string {
    return this.facade.translationMessage();
  }

  get error(): string {
    return this.facade.translationError();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['translations']) {
      this.translations = {
        es: { ...this.translations.es },
        en: { ...this.translations.en },
      };
      if (!this.editingEssay) this.essayEditorContent = this.activeTranslation().essay;
    }
    if (changes['localizedDetails']) {
      this.localizedDetails = {
        es: { ...this.localizedDetails.es },
        en: { ...this.localizedDetails.en },
      };
    }
    if (changes['details']) {
      this.details = { ...this.details };
    }
  }

  setActiveLocale(locale: AdminLocale): void {
    this.activeLocale = locale;
    this.editingEssay = false;
    this.essayEditorContent = this.activeTranslation().essay;
    this.facade.translationMessage.set('');
    this.facade.translationError.set('');
  }

  activeTranslation(): AdminEntityPreviewTranslationForm {
    return this.translations[this.activeLocale];
  }

  activeDetails(): AdminEntityPreviewLocalizedDetailsForm {
    return this.activeLocale === 'es'
      ? (this.details as AdminEntityPreviewLocalizedDetailsForm)
      : this.localizedDetails[this.activeLocale];
  }

  updateTranslation(field: keyof AdminEntityPreviewTranslationForm, value: string): void {
    this.translations = {
      ...this.translations,
      [this.activeLocale]: { ...this.activeTranslation(), [field]: value },
    };
    this.emitDraft();
  }

  updateEssay(value: string): void {
    this.editingEssay = true;
    this.updateTranslation('essay', value);
  }

  refreshEssayEditor(content: string): void {
    this.essayEditorContent = content;
    this.essayEditorVersion += 1;
  }

  handleEssayShortcut(event: KeyboardEvent, editor: RichTextComponent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    const format =
      event.key.toLowerCase() === 'b' ? 'bold' : event.key.toLowerCase() === 'i' ? 'italic' : null;
    if (!format) return;
    event.preventDefault();
    editor.format(format);
  }

  updateDetails(field: keyof AdminEntityPreviewLocalizedDetailsForm, value: string): void {
    if (this.activeLocale === 'es') {
      this.details = { ...this.details, [field]: value };
    } else {
      this.localizedDetails = {
        ...this.localizedDetails,
        [this.activeLocale]: { ...this.activeDetails(), [field]: value },
      };
    }
    this.emitDraft();
  }

  status(locale: AdminLocale) {
    return translationStatus(this.translations, locale);
  }

  statusLabel(locale: AdminLocale): string {
    return translationStatusLabel(this.status(locale));
  }

  statusMark(locale: AdminLocale): string {
    return translationStatusMark(this.status(locale));
  }

  supportsTypedDetails(): boolean {
    return false;
  }

  save(): void {
    if (!this.entityId) {
      this.facade.translationError.set('Guarda primero la entity antes de editar traducciones.');
      return;
    }

    const payload = buildTranslationPayload(
      this.activeLocale,
      this.translations,
      this.details,
      this.localizedDetails,
      (value) => this.toNullableNumber(value),
    );
    if (!payload.title) {
      this.facade.translationError.set('El título de la traducción es obligatorio.');
      return;
    }

    this.facade.saveTranslation(this.entityId, this.activeLocale, payload).subscribe({
      next: (entity) => {
        this.saved.emit(entity);
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  private emitDraft(): void {
    this.draftChange.emit({
      translations: {
        es: { ...this.translations.es },
        en: { ...this.translations.en },
      },
      localizedDetails: {
        es: { ...this.localizedDetails.es },
        en: { ...this.localizedDetails.en },
      },
      details: { ...this.details },
    });
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
