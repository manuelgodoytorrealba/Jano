import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AdminEntityRouteShell } from './admin-entity-route-shell';
import { ADMIN_ENTITY_DASHBOARD_SECTIONS } from './admin-entity-shell.presenter';

describe('AdminEntityRouteShell', () => {
  it('uses the continuous editorial order', () => {
    expect(ADMIN_ENTITY_DASHBOARD_SECTIONS.map((section) => section.id)).toEqual([
      'section-content',
      'section-relations',
      'section-media',
      'section-sources',
      'section-contributors',
      'section-preview',
    ]);
  });

  it('owns safe route context and restores persisted shell state', () => {
    const router = { navigate: vi.fn() };
    localStorage.setItem('jano-admin-entity-section:entity-1', 'section-media');
    localStorage.setItem('jano-admin-entity-sidebar:entity-1', 'hidden');
    TestBed.configureTestingModule({
      providers: [
        AdminEntityRouteShell,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'id' ? 'entity-1' : null) },
              queryParamMap: { get: () => 'https://example.com' },
            },
          },
        },
        { provide: Router, useValue: router },
      ],
    });
    const shell = TestBed.inject(AdminEntityRouteShell);

    shell.initialize();

    expect(shell.entityId).toBe('entity-1');
    expect(shell.isEdit).toBe(true);
    expect(shell.returnTo).toBe('/admin');
    expect(shell.activeSection).toBe('section-media');
    expect(shell.sidebarVisible).toBe(false);

    shell.navigateToDraft({
      id: 'draft-1',
      type: 'ARTWORK',
      title: 'Sin título',
      slug: '_draft-1',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/admin/entities', 'draft-1', 'edit'], {
      queryParams: { returnTo: '/admin' },
      replaceUrl: true,
    });
    localStorage.removeItem('jano-admin-entity-section:entity-1');
    localStorage.removeItem('jano-admin-entity-sidebar:entity-1');
  });
});
