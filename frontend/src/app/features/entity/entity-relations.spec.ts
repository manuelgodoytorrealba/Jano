import { entityConnectionCounts } from './entity-detail.presenter';
import { describe, expect, it } from 'vitest';
import { PublicEntity } from '../../core/api/entities.models';
import { EntityDetailViewComponent } from './entity-detail-view.component';

describe('entity relations', () => {
  it('counts distinct graph entities and relations across both directions, including self links', () => {
    const center = { id: 'center' };
    const other = { id: 'other' };
    const self = { id: 'self', from: center, to: center };
    const entity = {
      id: 'center',
      outgoing: [{ id: 'a', to: other }, self],
      incoming: [{ id: 'b', from: other }, self],
    } as PublicEntity;
    expect(entityConnectionCounts(entity)).toEqual({ entities: 2, relations: 3 });
    expect(entityConnectionCounts({ id: 'empty' } as PublicEntity)).toEqual({
      entities: 1,
      relations: 0,
    });
  });

  it('expands and collapses both directions independently without dropping relations', () => {
    const view = Object.create(EntityDetailViewComponent.prototype) as EntityDetailViewComponent;
    view.outgoingRelationLimit = 3;
    view.incomingRelationLimit = 3;
    const entity = {
      outgoing: Array.from({ length: 7 }, (_, id) => ({ id: String(id) })),
      incoming: Array.from({ length: 5 }, (_, id) => ({ id: String(id) })),
    } as PublicEntity;
    expect(view.visibleOutgoingRelations(entity)).toHaveLength(3);
    expect(view.hiddenOutgoingRelations(entity)).toBe(4);
    view.toggleOutgoingRelations(entity);
    expect(view.visibleOutgoingRelations(entity)).toEqual(entity.outgoing);
    expect(view.visibleIncomingRelations(entity)).toHaveLength(3);
    view.toggleIncomingRelations(entity);
    expect(view.visibleIncomingRelations(entity)).toEqual(entity.incoming);
    view.toggleOutgoingRelations(entity);
    view.toggleIncomingRelations(entity);
    expect(view.visibleOutgoingRelations(entity)).toHaveLength(3);
    expect(view.visibleIncomingRelations(entity)).toHaveLength(3);
    expect(view.visibleOutgoingRelations(null)).toEqual([]);
  });
});
