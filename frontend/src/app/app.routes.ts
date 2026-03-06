import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';
import { EntitiesListComponent } from './features/entities/entities-list.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { MySpaceComponent } from './features/my-space/my-space.component';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'my-space',
    component: MySpaceComponent,
    canActivate: [authGuard],
  },

  { path: 'entity/:slug', component: EntityComponent },
  { path: 'entities/:type', component: EntitiesListComponent },

  { path: '**', redirectTo: '' },
];