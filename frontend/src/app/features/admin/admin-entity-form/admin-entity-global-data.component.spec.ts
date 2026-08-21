import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import {
  createEmptyLocalizedDetailsForm,
  createEmptyTranslationForm,
} from './admin-entity-content.presenter';
import { AdminEntityFormFacade } from './admin-entity-form.facade';
import { AdminEntityGlobalDataComponent } from './admin-entity-global-data.component';

describe('AdminEntityGlobalDataComponent', () => {
  it('summarizes discovery metadata without exposing its editor', () => {
    const component = new AdminEntityGlobalDataComponent();
    component.classifications = [{}, {}];
    component.tags = [{}, {}, {}];
    component.aliases = [{} as never];

    expect(component.discoverabilitySummary()).toBe('2 clasificaciones · 3 tags · 1 alias');
  });

  it('replaces a provisional slug while preserving immutable draft inputs', () => {
    TestBed.configureTestingModule({
      imports: [AdminEntityGlobalDataComponent],
      providers: [
        AdminEntityFormFacade,
        { provide: AdminEntitiesApi, useValue: { list: () => undefined } },
      ],
    });
    const component = TestBed.createComponent(AdminEntityGlobalDataComponent).componentInstance;
    const inputForm = {
      type: 'ARTWORK' as const,
      title: '',
      slug: '_draft-123',
      summary: '',
      content: '',
      contentLevel: '' as const,
      status: 'DRAFT' as const,
      startYear: null,
      endYear: null,
    };
    component.isEdit = true;
    component.form = inputForm;
    component.translations = {
      es: createEmptyTranslationForm(),
      en: createEmptyTranslationForm(),
    };
    component.localizedDetails = {
      es: createEmptyLocalizedDetailsForm(),
      en: createEmptyLocalizedDetailsForm(),
    };
    component.ngOnChanges({
      form: new SimpleChange(null, inputForm, true),
      isEdit: new SimpleChange(false, true, true),
    });
    let emittedTitle = '';
    component.draftChange.subscribe((draft) => (emittedTitle = draft.form.title));

    component.onTranslationDraftChange({
      translations: {
        ...component.translations,
        es: {
          ...component.translations.es,
          title: 'Édouard Manet',
          shortDescription: 'Una lectura editorial.',
          essay: 'Mirada, representación y poder.',
        },
      },
      localizedDetails: component.localizedDetails,
      details: {},
    });

    expect(inputForm.title).toBe('');
    expect(emittedTitle).toBe('Édouard Manet');
    expect(component.form).toMatchObject({
      title: 'Édouard Manet',
      slug: 'edouard-manet',
      summary: 'Una lectura editorial.',
      content: 'Mirada, representación y poder.',
    });
  });
});
