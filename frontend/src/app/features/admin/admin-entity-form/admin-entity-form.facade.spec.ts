import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import { AdminEntityFormFacade } from './admin-entity-form.facade';

describe('AdminEntityFormFacade', () => {
  it('owns save feedback while preserving the API response', async () => {
    const entity = { id: 'entity-1', title: 'Guernica' };
    const api = { update: vi.fn().mockReturnValue(of(entity)), create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [AdminEntityFormFacade, { provide: AdminEntitiesApi, useValue: api }],
    });
    const facade = TestBed.inject(AdminEntityFormFacade);

    await expect(
      firstValueFrom(
        facade.saveEntity('entity-1', {
          type: 'ARTWORK',
          title: 'Guernica',
          slug: 'guernica',
        }),
      ),
    ).resolves.toEqual(entity);

    expect(api.update).toHaveBeenCalledOnce();
    expect(facade.saving()).toBe(false);
    expect(facade.saveState()).toBe('saved');
    expect(facade.successMessage()).toBe('Entity actualizada correctamente.');
  });

  it('creates a typed Draft and clears its pending state', async () => {
    const entity = { id: 'draft-1', type: 'CONCEPT' };
    const api = { createDraft: vi.fn().mockReturnValue(of(entity)) };
    TestBed.configureTestingModule({
      providers: [AdminEntityFormFacade, { provide: AdminEntitiesApi, useValue: api }],
    });
    const facade = TestBed.inject(AdminEntityFormFacade);

    await expect(firstValueFrom(facade.createDraft('CONCEPT'))).resolves.toEqual(entity);

    expect(api.createDraft).toHaveBeenCalledWith('CONCEPT');
    expect(facade.creatingDraft()).toBe(false);
    expect(facade.createDraftError()).toBe('');
  });
});
