import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { PublicEntity } from '../../core/api/entities.models';
import { EntityDetailViewComponent } from './entity-detail-view.component';

describe('detail visit restoration', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.querySelector('.app-shell__content')?.remove();
  });

  it('returns to the mobile article position even when the window never scrolled', async () => {
    const content = document.createElement('main');
    content.className = 'app-shell__content';
    content.style.overflowY = 'auto';
    document.body.append(content);
    content.scrollTop = 1200;
    let saved: { slug: string; windowY: number } | null = null;
    let capture!: () => typeof saved;
    await TestBed.configureTestingModule({
      imports: [EntityDetailViewComponent],
      providers: [
        { provide: I18nService, useValue: { t: (key: string) => key, locale: () => 'es' } },
        { provide: EntityRouteArtworkTransitionService, useValue: {} },
        {
          provide: NavigationMemoryService,
          useValue: {
            visit: () => ({ key: 'article', url: '/entity/article' }),
            read: () => saved,
            register: (_slot: string, next: typeof capture) => {
              capture = next;
            },
          },
        },
      ],
    })
      .overrideComponent(EntityDetailViewComponent, { set: { template: '' } })
      .compileComponents();
    const article = { slug: 'article', title: 'Article', type: 'ARTICLE' } as PublicEntity;
    const first = TestBed.createComponent(EntityDetailViewComponent);
    first.componentRef.setInput('entity', article);
    first.detectChanges();
    expect(window.scrollY).toBe(0);
    saved = capture();
    expect(saved?.windowY).toBe(1200);
    first.destroy();
    content.scrollTop = 0;
    const returned = TestBed.createComponent(EntityDetailViewComponent);
    returned.componentRef.setInput('entity', article);
    returned.detectChanges();
    TestBed.tick();
    expect(content.scrollTop).toBe(1200);
    returned.destroy();
  });

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
