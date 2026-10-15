import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { PublicEntity } from '../../core/api/entities.models';
import { EntityDetailViewComponent } from './entity-detail-view.component';
import { RelationControlsComponent } from './relation-controls.component';

describe('entity relations', () => {
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

  it('uses assigned media and falls back to the entity icon on a failed image', () => {
    TestBed.configureTestingModule({
      imports: [RelationControlsComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RelationControlsComponent);
    fixture.componentRef.setInput('endpoint', {
      id: 'artist',
      slug: 'artist',
      title: 'Artist',
      type: 'ARTIST',
      resolvedMedia: { thumbnail: { url: '/uploads/artist.jpg' } },
    });
    fixture.componentRef.setInput('label', 'Open Artist');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img')?.getAttribute('src')).toBe('/uploads/artist.jpg');
    root.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.relation-entity-icon svg')).not.toBeNull();
    fixture.componentRef.setInput('endpoint', {
      id: 'concept',
      slug: 'concept',
      title: 'Concept',
      type: 'CONCEPT',
    });
    fixture.detectChanges();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.relation-entity-icon svg')).not.toBeNull();
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/entity/concept');
  });
});
