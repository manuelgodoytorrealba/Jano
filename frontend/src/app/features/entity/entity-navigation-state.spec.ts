import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { PublicEntity } from '../../core/api/entities.models';
import { EntityDetailViewComponent } from './entity-detail-view.component';

describe('detail visit restoration', () => {
  it('captures the pending reading position before another rapid history navigation', async () => {
    let capture = () => ({ windowY: 0 });
    await TestBed.configureTestingModule({
      imports: [EntityDetailViewComponent],
      providers: [
        { provide: I18nService, useValue: { t: (key: string) => key, locale: () => 'es' } },
        { provide: EntityRouteArtworkTransitionService, useValue: {} },
        {
          provide: NavigationMemoryService,
          useValue: {
            visit: () => ({ key: 'reading', url: '/entity/eco' }),
            read: () => ({
              slug: 'eco',
              tab: 'relations',
              windowY: 900,
              workspaceMode: 'split',
              workspaceFocused: false,
              outgoingLimit: 6,
              incomingLimit: 6,
            }),
            register: (_slot: string, next: () => { windowY: number }) => {
              capture = next;
            },
          },
        },
      ],
    })
      .overrideComponent(EntityDetailViewComponent, { set: { template: '' } })
      .compileComponents();
    const fixture = TestBed.createComponent(EntityDetailViewComponent);
    fixture.componentInstance.entity = {
      slug: 'eco',
      title: 'Eco',
      type: 'ARTWORK',
    } as PublicEntity;
    fixture.componentInstance.ngOnChanges({});
    expect(fixture.componentInstance.informationTab).toBe('relations');
    expect(capture().windowY).toBe(900);
    fixture.destroy();
  });
});
