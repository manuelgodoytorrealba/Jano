import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'curated',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/recommended/recommended.component').then((m) => m.RecommendedComponent),
  },
  {
    path: 'recommended',
    redirectTo: 'curated',
    pathMatch: 'full',
  },
  {
    path: 'search',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'entities',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/entities/entities-list.component').then((m) => m.EntitiesListComponent),
  },
  {
    path: 'entities/:type',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/entities/entities-list.component').then((m) => m.EntitiesListComponent),
  },
  {
    path: 'entity/:slug',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/entity/entity.component').then((m) => m.EntityComponent),
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    data: { layout: 'auth' },
  },
  {
    path: 'blocked',
    loadComponent: () =>
      import('./features/auth/blocked/blocked.component').then((m) => m.BlockedComponent),
  },
  {
    path: 'my-space',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-space/my-space.component').then((m) => m.MySpaceComponent),
  },
  {
    path: 'collections/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/collection-detail/collection-detail.component').then(
        (m) => m.CollectionDetailComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'visual-selector',
        loadComponent: () =>
          import('./features/admin/admin-entities-deck/admin-entities-deck.component').then(
            (m) => m.AdminEntitiesDeckComponent,
          ),
      },
      {
        path: 'entities',
        loadComponent: () =>
          import('./features/admin/admin-entities/admin-entities.component').then(
            (m) => m.AdminEntitiesComponent,
          ),
      },
      {
        path: 'home-decks',
        redirectTo: 'curations',
        pathMatch: 'full',
      },
      {
        path: 'curations',
        loadComponent: () =>
          import('./features/admin/admin-curations/admin-curations.component').then(
            (m) => m.AdminCurationsComponent,
          ),
      },
      {
        path: 'curations/new',
        loadComponent: () =>
          import('./features/admin/admin-curations/admin-curations.component').then(
            (m) => m.AdminCurationsComponent,
          ),
      },
      {
        path: 'home-decks/:id/edit',
        loadComponent: () =>
          import('./features/admin/admin-home-deck-editor/admin-home-deck-editor.component').then(
            (m) => m.AdminHomeDeckEditorComponent,
          ),
      },
      {
        path: 'entities/new',
        loadComponent: () =>
          import('./features/admin/admin-entity-form/admin-entity-form.component').then(
            (m) => m.AdminEntityFormComponent,
          ),
      },
      {
        path: 'entities/:id/edit',
        loadComponent: () =>
          import('./features/admin/admin-entity-form/admin-entity-form.component').then(
            (m) => m.AdminEntityFormComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
