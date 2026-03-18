import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';
import { EntitiesListComponent } from './features/entities/entities-list.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { MySpaceComponent } from './features/my-space/my-space.component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { AdminEntitiesComponent } from './features/admin/admin-entities/admin-entities.component';
import { AdminEntitiesDeckComponent } from './features/admin/admin-entities-deck/admin-entities-deck.component';
import { AdminEntityFormComponent } from './features/admin/admin-entity-form/admin-entity-form.component';
import { RecommendedComponent } from './features/recommended/recommended.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'recommended', component: RecommendedComponent },
  { path: 'entities/:type', component: EntitiesListComponent },
  { path: 'entity/:slug', component: EntityComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'my-space', component: MySpaceComponent, canActivate: [authGuard] },

  // 🔥 ADMIN NUEVO FLUJO
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      // 👉 pantalla inicial: deck visual
      { path: '', component: AdminEntitiesDeckComponent },

      // 👉 tabla real (con filtros y query params)
      { path: 'entities', component: AdminEntitiesComponent },

      // 👉 crear
      { path: 'entities/new', component: AdminEntityFormComponent },

      // 👉 editar
      { path: 'entities/:id/edit', component: AdminEntityFormComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];