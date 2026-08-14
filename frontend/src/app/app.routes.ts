import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'entities',
    loadComponent: () =>
      import('./features/entities/entities-list.component').then((m) => m.EntitiesListComponent),
  },
  {
    path: 'entities/:type',
    loadComponent: () =>
      import('./features/entities/entities-list.component').then((m) => m.EntitiesListComponent),
  },
  {
    path: 'research',
    loadComponent: () =>
      import('./features/research-publications/research-publications.component').then(
        (m) => m.ResearchPublicationsComponent,
      ),
  },
  {
    path: 'research/:id',
    loadComponent: () =>
      import('./features/research-publication/research-publication.component').then(
        (m) => m.ResearchPublicationComponent,
      ),
  },
  {
    path: 'entity/:slug',
    loadComponent: () =>
      import('./features/entity/entity.component').then((m) => m.EntityComponent),
  },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    data: { layout: 'auth' },
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    data: { layout: 'auth' },
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    data: { layout: 'auth' },
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
    data: { layout: 'auth' },
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
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
        path: 'entities',
        loadComponent: () =>
          import('./features/admin/admin-entities/admin-entities.component').then(
            (m) => m.AdminEntitiesComponent,
          ),
      },
      {
        path: 'research/prototype/:screen',
        redirectTo: 'research',
        pathMatch: 'full',
      },
      {
        path: 'research/new',
        loadComponent: () =>
          import('./features/admin/admin-research/admin-research.component').then(
            (m) => m.AdminResearchComponent,
          ),
      },
      {
        path: 'research',
        loadComponent: () =>
          import('./features/admin/admin-research/admin-research.component').then(
            (m) => m.AdminResearchComponent,
          ),
      },
      {
        path: 'research/:id/sections/:sectionId',
        loadComponent: () =>
          import('./features/admin/admin-research/research-project.component').then(
            (m) => m.ResearchProjectComponent,
          ),
      },
      {
        path: 'research/:id',
        loadComponent: () =>
          import('./features/admin/admin-research/research-project.component').then(
            (m) => m.ResearchProjectComponent,
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
      {
        path: 'entities/:id',
        loadComponent: () =>
          import('./features/admin/admin-entity-form/admin-entity-form.component').then(
            (m) => m.AdminEntityFormComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
