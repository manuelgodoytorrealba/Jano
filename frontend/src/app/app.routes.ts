import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';
import { EntitiesListComponent } from './features/entities/entities-list.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { MySpaceComponent } from './features/my-space/my-space.component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { AdminEntitiesComponent } from './features/admin/admin-entities.component';
import { AdminEntityFormComponent } from './features/admin/admin-entity-form.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'entities/:type', component: EntitiesListComponent },
  { path: 'entity/:slug', component: EntityComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'my-space', component: MySpaceComponent, canActivate: [authGuard] },

  { path: 'admin', component: AdminEntitiesComponent, canActivate: [adminGuard] },
  { path: 'admin/entities/new', component: AdminEntityFormComponent, canActivate: [adminGuard] },
  { path: 'admin/entities/:id/edit', component: AdminEntityFormComponent, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' },
];