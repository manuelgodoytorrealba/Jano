import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminEntitiesApi,
  AdminEntityDetailsPayload,
  AdminEntityResponse,
} from '../../../core/api/admin-entities.api';
import { AdminEntityDetailsEditorComponent } from './admin-entity-details-editor.component';

describe('AdminEntityDetailsEditorComponent', () => {
  it('owns details persistence and sends a normalized payload', () => {
    let payload: AdminEntityDetailsPayload | undefined;
    const entity = {} as AdminEntityResponse;
    const api = {
      updateDetails: vi.fn((_id: string, value: AdminEntityDetailsPayload) => {
        payload = value;
        return of(entity);
      }),
    };

    TestBed.configureTestingModule({
      imports: [AdminEntityDetailsEditorComponent],
      providers: [{ provide: AdminEntitiesApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(AdminEntityDetailsEditorComponent);
    const component = fixture.componentInstance;
    component.entityId = 'guernica';
    component.details = {
      technique: '  óleo sobre lienzo  ',
      materials: '  ',
      birthYear: 'not-a-number' as unknown as number,
    };

    component.save();

    expect(api.updateDetails).toHaveBeenCalledOnce();
    expect(payload?.technique).toBe('óleo sobre lienzo');
    expect(payload?.materials).toBeUndefined();
    expect(payload?.birthYear).toBeNull();
    expect(component.message).toBe('Ficha específica actualizada correctamente.');
  });
});
