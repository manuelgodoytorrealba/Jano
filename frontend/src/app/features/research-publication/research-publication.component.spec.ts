import { Component, Input, NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationMemoryService } from '../../core/navigation-memory.service';
import { ResearchApi, ResearchPublicPublication } from '../../core/api/research.api';
import { I18nService } from '../../core/i18n/i18n.service';
import { GraphComponent } from '../graph/graph.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { ResearchPublicationComponent } from './research-publication.component';

@Component({ selector: 'app-rich-text', template: '<p>{{ text }}</p>' })
class ReadingStub {
  @Input() text = '';
}

const publication: ResearchPublicPublication = {
  id: 'atlas',
  title: 'Atlas cultural',
  objective: 'Objetivo único.',
  scope: null,
  coverImageUrl: '/cover.jpg',
  publishedAt: '2026-10-18T12:00:00Z',
  outlineSections: [
    {
      id: 'one',
      title: 'Primer capítulo',
      objective: null,
      notes: null,
      imageUrl: null,
      sortOrder: 0,
      drafts: [
        { title: null, currentRevision: { content: 'Texto completo del primer capítulo.' } },
      ],
    },
    {
      id: 'two',
      title: 'Segundo capítulo',
      objective: 'Resumen del segundo capítulo.',
      notes: null,
      imageUrl: null,
      sortOrder: 1,
      drafts: [],
    },
  ],
  entities: [],
  relations: [],
  sources: [],
  related: [],
};

describe('Public research reading', () => {
  const params = new BehaviorSubject(convertToParamMap({ id: 'atlas' }));
  const getPublished = vi.fn();
  const memory = { read: vi.fn(), register: vi.fn() };
  let query = convertToParamMap({});

  beforeEach(async () => {
    params.next(convertToParamMap({ id: 'atlas' }));
    query = convertToParamMap({});
    getPublished.mockReset().mockReturnValue(of(publication));
    memory.read.mockReset().mockReturnValue(null);
    memory.register.mockReset();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
    await TestBed.configureTestingModule({
      imports: [ResearchPublicationComponent],
      providers: [
        provideRouter([]),
        { provide: NavigationMemoryService, useValue: memory },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            snapshot: {
              get queryParamMap() {
                return query;
              },
            },
          },
        },
        { provide: ResearchApi, useValue: { getPublished } },
        { provide: I18nService, useValue: { t: (key: string) => key, locale: () => 'es' } },
      ],
    })
      .overrideComponent(ResearchPublicationComponent, {
        remove: { imports: [GraphComponent, RichTextComponent] },
        add: { imports: [ReadingStub], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.overflow = '';
  });

  function create() {
    const fixture = TestBed.createComponent(ResearchPublicationComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('restores the reading visit in its actual scroll container after returning from an entity', async () => {
    memory.read.mockReturnValue({
      publicationId: 'atlas',
      chapterId: 'two',
      tab: 'content',
      top: 920,
    });
    const fixture = TestBed.createComponent(ResearchPublicationComponent);
    const scroller = document.createElement('main');
    scroller.style.overflowY = 'auto';
    Object.defineProperties(scroller, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 400 },
    });
    document.body.append(scroller);
    scroller.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(1);
    expect(scroller.scrollTop).toBe(920);
    const capture = memory.register.mock.calls[0][1] as () => { top: number };
    scroller.scrollTop = 0;
    expect(capture().top).toBe(920);
    const cover = fixture.nativeElement.querySelector(
      '.publication__cover img',
    ) as HTMLImageElement;
    Object.defineProperty(cover, 'complete', { value: true });
    cover.dispatchEvent(new Event('load'));
    expect(scroller.scrollTop).toBe(920);
    scroller.scrollTop = 1100;
    expect(capture()).toEqual({
      publicationId: 'atlas',
      chapterId: 'two',
      tab: 'content',
      top: 1100,
    });
    fixture.destroy();
    scroller.remove();
  });

  it('restores the document when an overflow ancestor does not actually scroll', async () => {
    memory.read.mockReturnValue({
      publicationId: 'atlas',
      chapterId: 'one',
      tab: 'content',
      top: 1500,
    });
    const fixture = TestBed.createComponent(ResearchPublicationComponent);
    const shell = document.createElement('div');
    shell.style.overflowY = 'auto';
    document.body.append(shell);
    shell.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.scrollTop).toBe(1500);
    expect(shell.scrollTop).toBe(0);
    fixture.destroy();
    shell.remove();
    document.documentElement.scrollTop = 0;
  });

  it('ignores a reading visit belonging to a different publication', () => {
    memory.read.mockReturnValue({
      publicationId: 'other',
      chapterId: 'two',
      tab: 'sources',
      top: 920,
    });
    const fixture = create();
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(0);
    expect(fixture.componentInstance.activeTab()).toBe('content');
  });

  it('shows one complete chapter and one introduction, with four linked tab panels', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-rich-text')?.textContent).toContain(
      'Texto completo del primer capítulo.',
    );
    expect(root.textContent?.match(/Objetivo único\./g)).toHaveLength(1);
    const tabs = [...root.querySelectorAll('[role=tab]')];
    expect(tabs).toHaveLength(4);
    for (const tab of tabs) {
      const panel = root.querySelector('#' + tab.getAttribute('aria-controls'));
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
      expect((panel as HTMLElement).hidden).toBe(tab.getAttribute('aria-selected') !== 'true');
    }
  });

  it('keeps the chosen chapter across tabs and puts its identity in the return URL', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.selectChapter('two', publication);
    c.setTab('sources');
    c.setTab('content');
    fixture.detectChanges();
    expect(c.chapterIndex(publication)).toBe(1);
    expect(fixture.nativeElement.querySelector('.publication__chapter h2').textContent).toBe(
      'Segundo capítulo',
    );
    expect(
      fixture.nativeElement.querySelector('.publication__section-summary').textContent,
    ).toContain('Resumen del segundo capítulo.');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { chapter: 'two' }, replaceUrl: true }),
    );
    c.selectChapter('missing', publication);
    expect(c.chapterIndex(publication)).toBe(1);
    expect(getPublished).toHaveBeenCalledTimes(1);
  });

  it('restores the actual app scroll container when returning from another tab', async () => {
    const fixture = create();
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    Object.defineProperties(scroller, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 400 },
    });
    document.body.append(scroller);
    scroller.append(fixture.nativeElement);
    try {
      scroller.scrollTop = 420;
      fixture.componentInstance.setTab('sources');
      fixture.detectChanges();
      scroller.scrollTop = 0;
      fixture.componentInstance.setTab('content');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(scroller.scrollTop).toBe(420);
      fixture.componentInstance.openOverlay('image');
      expect(scroller.style.overflow).toBe('hidden');
      fixture.componentInstance.closeOverlay();
      expect(scroller.style.overflow).toBe('');
    } finally {
      fixture.destroy();
      scroller.remove();
    }
  });

  it('restores a linked chapter and falls back safely if the chapter no longer exists', () => {
    query = convertToParamMap({ chapter: 'two' });
    const fixture = create();
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(1);
    fixture.componentInstance.activeChapterId.set('removed');
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(0);
  });

  it('supports keyboard tabs and preserves the selected chapter', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const first = root.querySelector('[role=tab]') as HTMLButtonElement;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('sources');
    expect(root.querySelector('#publication-tab-sources')?.getAttribute('tabindex')).toBe('0');
    expect((root.querySelector('#publication-panel-sources') as HTMLElement).hidden).toBe(false);
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(0);
  });

  it('opens an overlay without changing reading state, locks background scrolling and cleans up', () => {
    const fixture = create();
    fixture.componentInstance.selectChapter('two', publication);
    const trigger = fixture.nativeElement.querySelector(
      '.publication__cover-open',
    ) as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    fixture.componentInstance.closeOverlay();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(fixture.componentInstance.chapterIndex(publication)).toBe(1);
    fixture.componentInstance.openOverlay('image');
    fixture.destroy();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('distinguishes loading, a recoverable failure and an unavailable publication', () => {
    const response = new Subject<ResearchPublicPublication>();
    getPublished
      .mockReturnValueOnce(response)
      .mockReturnValueOnce(of(publication))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[aria-busy=true]')).toBeTruthy();
    response.error(new HttpErrorResponse({ status: 503 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('research.publication.loadFailed');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Atlas cultural');
    params.next(convertToParamMap({ id: 'removed' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('research.publication.unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('research.publication.retry');
  });

  it('keeps every real node in the full map but limits the preview to existing neighbours', () => {
    const graphPublication = {
      ...publication,
      entities: Array.from({ length: 10 }, (_, i) => ({
        id: 'e' + i,
        title: 'Entity ' + i,
        kind: 'WORK',
        summary: null,
        canonicalEntity: null,
      })),
      relations: Array.from({ length: 9 }, (_, i) => ({
        id: 'r' + i,
        relationType: { label: 'RELATED_TO' },
        fromEntity: { id: 'e0', title: 'Entity 0', kind: 'WORK' },
        toEntity: { id: 'e' + (i + 1), title: 'Entity', kind: 'WORK' },
      })),
    };
    getPublished.mockReturnValue(of(graphPublication));
    const fixture = create();
    const subscription = fixture.componentInstance.view$.subscribe((view) => {
      if (view.status !== 'ready') return;
      expect(view.graph.nodes).toHaveLength(10);
      expect(view.graph.edges).toHaveLength(9);
      expect(view.previewGraph.nodes).toHaveLength(6);
      expect(view.previewGraph.edges).toHaveLength(5);
      expect(view.previewGraph.edges.every((edge) => view.graph.edges.includes(edge))).toBe(true);
    });
    subscription.unsubscribe();
    fixture.componentInstance.openOverlay('map');
    fixture.detectChanges();
    const expandedGraph = fixture.nativeElement.querySelector('dialog app-graph') as HTMLElement & {
      graphData: { nodes: unknown[] };
      detailLayout: boolean;
      overviewMode: boolean;
    };
    expect(expandedGraph.graphData.nodes).toHaveLength(10);
    expect(expandedGraph.detailLayout).toBe(true);
    expect(expandedGraph.overviewMode).not.toBe(true);
  });
});
