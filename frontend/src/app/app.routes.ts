import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';
import { EntitiesListComponent } from './features/entities/entities-list.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { MySpaceComponent } from './features/my-space/my-space.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'entities/:type', component: EntitiesListComponent },
  { path: 'entity/:slug', component: EntityComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'my-space', component: MySpaceComponent },

  { path: '**', redirectTo: '' },
];