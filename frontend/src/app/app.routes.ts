import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { EntityComponent } from './features/entity/entity.component';
import { EntitiesListComponent } from './features/entities/entities-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'entity/:slug', component: EntityComponent },

  // ✅ NUEVA
  { path: 'entities/:type', component: EntitiesListComponent },

  { path: '**', redirectTo: '' },
];