import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'entity/:slug', component: EntityComponent },
  { path: '**', redirectTo: '' },
];