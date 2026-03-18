import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CollectionsApi } from '../../core/api/collections.api';
import { SavedApi } from '../../core/api/saved.api';

@Component({
  standalone: true,
  selector: 'app-my-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  templateUrl: './my-space.component.html',
  styleUrls: ['./my-space.component.scss'],
})
export class MySpaceComponent {
  auth = inject(AuthService);
  private collectionsApi = inject(CollectionsApi);
  private savedApi = inject(SavedApi);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  newCollectionName = '';
  newCollectionDescription = '';
  creating = false;
  createError = '';

  saved$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
    switchMap(([user]) => {
      if (!user) return of([]);

      return this.savedApi.list().pipe(
        catchError(() => of([])),
      );
    }),
  );

  collections$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
    switchMap(([user]) => {
      if (!user) return of([]);

      return this.collectionsApi.list().pipe(
        catchError(() => of([])),
      );
    }),
  );

  thumb(e: any): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  cleanWiki(text: string): string {
    return (text ?? '').replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  isAdmin(user: any): boolean {
    return String(user?.role ?? '').toUpperCase() === 'ADMIN';
  }

  roleLabel(user: any): string {
    return this.isAdmin(user) ? 'ADMIN' : 'MEMBER';
  }

  createCollection() {
    const name = this.newCollectionName.trim();
    const description = this.newCollectionDescription.trim();

    if (!name || this.creating) return;

    this.creating = true;
    this.createError = '';

    this.collectionsApi.create({
      name,
      description: description || undefined,
    }).subscribe({
      next: () => {
        this.newCollectionName = '';
        this.newCollectionDescription = '';
        this.creating = false;
        this.refresh$.next();
      },
      error: (err) => {
        this.creating = false;
        this.createError = err?.error?.message ?? 'No se pudo crear la colección';
      },
    });
  }

  removeSaved(entityId: string) {
    this.savedApi.remove(entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => { },
    });
  }

  removeFromCollection(collectionId: string, entityId: string) {
    this.collectionsApi.removeEntity(collectionId, entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => { },
    });
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
    this.refresh$.next();
    this.router.navigate(['/login']);
  }
}