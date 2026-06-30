import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AdminEntityRouteShell } from './admin-entity-route-shell';

describe('AdminEntityRouteShell', () => {
  it('owns safe route context and restores persisted shell state', () => {
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
        { provide: Router, useValue: {} },
      ],
    });
    const shell = TestBed.inject(AdminEntityRouteShell);

    shell.initialize();

    expect(shell.entityId).toBe('entity-1');
    expect(shell.isEdit).toBe(true);
    expect(shell.returnTo).toBe('/admin');
    expect(shell.activeSection).toBe('section-media');
    expect(shell.sidebarVisible).toBe(false);
    localStorage.removeItem('jano-admin-entity-section:entity-1');
    localStorage.removeItem('jano-admin-entity-sidebar:entity-1');
  });
});
