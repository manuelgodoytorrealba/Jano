import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  AttributeDefinition,
  AttributesApi,
  CreateAttributeDefinitionPayload,
  EntityAttribute,
  EntityAttributeMutationPayload,
} from '../../../core/api/attributes.api';
import { AdminEntityAttributesEditorComponent } from './admin-entity-attributes-editor.component';

describe('AdminEntityAttributesEditorComponent', () => {
  it('updates an attribute and preserves null when clearing assertion metadata', () => {
    let payload: EntityAttributeMutationPayload | undefined;
    const definition: AttributeDefinition = {
      id: 'title',
      key: 'title',
      label: 'Título alternativo',
      valueType: 'TEXT',
      isMultiple: false,
    };
    const attribute: EntityAttribute = {
      id: 'attribute-1',
      definition,
      valueText: 'Guernica',
      status: 'PUBLISHED',
      confidence: 0.8,
      validFromYear: 1937,
    };
    const api = {
      update: vi.fn((_id: string, value: EntityAttributeMutationPayload) => {
        payload = value;
        return of({ ...attribute, confidence: null, validFromYear: null });
      }),
    };

    TestBed.configureTestingModule({
      imports: [AdminEntityAttributesEditorComponent],
      providers: [{ provide: AttributesApi, useValue: api }],
    });
    const component = TestBed.createComponent(
      AdminEntityAttributesEditorComponent,
    ).componentInstance;
    component.definitions = [definition];
    component.attributes = [attribute];

    component.edit(attribute);
    component.confidence = null;
    component.validFromYear = null;
    component.save();

    expect(api.update).toHaveBeenCalledWith('attribute-1', {
      valueText: 'Guernica',
      status: 'PUBLISHED',
      confidence: null,
      validFromYear: null,
      validToYear: null,
    });
    expect(component.attributes[0].confidence).toBeNull();
    expect(component.message).toBe('Atributo actualizado.');
  });

  it('creates a global definition and selects it for the current attribute', () => {
    let payload: CreateAttributeDefinitionPayload | undefined;
    const api = {
      createDefinition: vi.fn((value: CreateAttributeDefinitionPayload) => {
        payload = value;
        return of({ id: 'height', ...value });
      }),
    };

    TestBed.configureTestingModule({
      imports: [AdminEntityAttributesEditorComponent],
      providers: [{ provide: AttributesApi, useValue: api }],
    });
    const component = TestBed.createComponent(
      AdminEntityAttributesEditorComponent,
    ).componentInstance;
    component.definitionKey = 'height_cm';
    component.definitionLabel = 'Altura';
    component.definitionValueType = 'NUMBER';

    component.createDefinition();

    expect(payload).toEqual({
      key: 'height_cm',
      label: 'Altura',
      valueType: 'NUMBER',
      isMultiple: false,
    });
    expect(component.definitionId).toBe('height');
  });
});
