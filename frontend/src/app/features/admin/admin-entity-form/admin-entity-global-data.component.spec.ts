import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import {
  createEmptyLocalizedDetailsForm,
  createEmptyTranslationForm,
} from './admin-entity-content.presenter';
import { AdminEntityGlobalDataComponent } from './admin-entity-global-data.component';

describe('AdminEntityGlobalDataComponent', () => {
  it('emits an immutable draft and owns title-to-slug synchronization', () => {
    TestBed.configureTestingModule({
      imports: [AdminEntityGlobalDataComponent],
      providers: [{ provide: AdminEntitiesApi, useValue: { list: () => undefined } }],
    });
    const component = TestBed.createComponent(AdminEntityGlobalDataComponent).componentInstance;
    const inputForm = {
      type: 'ARTWORK' as const,
      title: '',
      slug: '',
      summary: '',
      content: '',
      contentLevel: '' as const,
      status: 'DRAFT' as const,
      startYear: null,
      endYear: null,
    };
    component.form = inputForm;
    component.translations = {
      es: createEmptyTranslationForm(),
      en: createEmptyTranslationForm(),
    };
    component.localizedDetails = {
      es: createEmptyLocalizedDetailsForm(),
      en: createEmptyLocalizedDetailsForm(),
    };
    component.ngOnChanges({ form: new SimpleChange(null, inputForm, true) });
    let emittedTitle = '';
    component.draftChange.subscribe((draft) => (emittedTitle = draft.form.title));

    component.onTitleChange('Édouard Manet');

    expect(inputForm.title).toBe('');
    expect(component.form.slug).toBe('edouard-manet');
    expect(component.translations.es.title).toBe('Édouard Manet');
    expect(emittedTitle).toBe('Édouard Manet');
  });
});
