import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminEntityResponse } from '../../../core/api/admin-entities.api';
import {
  ADMIN_ENTITY_DASHBOARD_SECTIONS,
  DashboardSectionId,
} from './admin-entity-shell.presenter';

@Injectable()
export class AdminEntityRouteShell {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  entityId = '';
  isEdit = false;
  returnTo = '/admin';
  activeSection: DashboardSectionId = 'section-preview';
  sidebarVisible = true;

  initialize(): void {
    this.entityId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEdit = !!this.entityId;
    this.returnTo = this.normalizeReturnTo(this.route.snapshot.queryParamMap.get('returnTo'));
    this.restoreSection();
    this.restoreSidebar();
  }

  selectSection(sectionId: DashboardSectionId): void {
    this.activeSection = sectionId;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.sectionStorageKey(), sectionId);
    }
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        this.sidebarStorageKey(),
        this.sidebarVisible ? 'visible' : 'hidden',
      );
    }
  }

  cancelHref(entityType?: string): string {
    if (this.returnTo !== '/admin') return this.returnTo;
    return this.isEdit && entityType
      ? `/admin/entities?type=${encodeURIComponent(entityType)}`
      : '/admin';
  }

  navigateAfterSave(mode: 'back' | 'stay', entity?: AdminEntityResponse): void {
    if (mode === 'stay') {
      if (!this.isEdit && entity?.id) {
        void this.router.navigate(['/admin/entities', entity.id, 'edit'], {
          queryParams: { returnTo: this.returnTo },
        });
      }
      return;
    }
    setTimeout(() => void this.router.navigateByUrl(this.cancelHref(entity?.type)), 700);
  }

  private restoreSection(): void {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(
      this.sectionStorageKey(),
    ) as DashboardSectionId | null;
    if (saved && ADMIN_ENTITY_DASHBOARD_SECTIONS.some((section) => section.id === saved)) {
      this.activeSection = saved;
    }
  }

  private restoreSidebar(): void {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(this.sidebarStorageKey());
    if (saved !== null) this.sidebarVisible = saved !== 'hidden';
  }

  private sectionStorageKey(): string {
    return `jano-admin-entity-section:${this.entityId || 'new'}`;
  }

  private sidebarStorageKey(): string {
    return `jano-admin-entity-sidebar:${this.entityId || 'new'}`;
  }

  private normalizeReturnTo(value: string | null): string {
    if (!value?.startsWith('/admin')) return '/admin';
    if (value.startsWith('/admin/entities/') || value.includes('://')) return '/admin';
    return value;
  }
}
