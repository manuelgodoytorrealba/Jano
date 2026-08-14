import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import {
  combineLatest,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicEntity } from '../../core/api/entities.models';
import { EntityRouteArtworkTransitionService } from '../../core/entity-route-artwork-transition.service';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { EntityDetailViewComponent } from './entity-detail-view.component';
import { AppChromeRailService } from '../../shared/ui/app-chrome/app-chrome-rail.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { detailHeroSubtitle, visualUrl } from './entity-detail.presenter';
import { EntitySavedCollectionsFacade } from './entity-saved-collections.facade';

type DetailWorkspaceMode = 'split' | 'image' | 'graph' | 'info';

@Component({
  standalone: true,
  selector: 'app-entity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, EntityDetailViewComponent],
  providers: [EntitySavedCollectionsFacade],
  templateUrl: './entity-detail-shell.component.html',
  styleUrls: ['./entity.component.scss'],
})
export class EntityComponent implements OnDestroy {
  private api = inject(EntitiesApi);
  private readonly seo = inject(SeoService);
  private readonly chromeRail = inject(AppChromeRailService);
  private readonly artworkTransition = inject(EntityRouteArtworkTransitionService);
  readonly i18n = inject(I18nService);
  readonly saved = inject(EntitySavedCollectionsFacade);

  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private currentEntity = signal<PublicEntity | null>(null);
  readonly preferredWorkspaceMode: DetailWorkspaceMode | null = this.normalizeWorkspaceMode(
    this.route.snapshot.queryParamMap.get('workspace'),
  );

  private readonly syncContextualRail = effect(() => {
    const entity = this.currentEntity();
    if (!entity) {
      this.chromeRail.clearContextualRail();
      return;
    }

    this.chromeRail.setContextualRail({
      kind: 'detail',
      isSaved: this.saved.isSaved(),
      saveLoading: this.saved.saveLoading() || !this.saved.saveStatusResolved(),
      canSave: this.saved.saveStatusResolved(),
      onSave: () => this.saveOrAuthenticate(entity),
      onShare: () => this.shareEntity(entity),
      onFocus: () => this.focusTop(),
    });
  });

  ngOnDestroy(): void {
    this.chromeRail.clearContextualRail();
  }

  shareEntity(entity: PublicEntity | null) {
    if (!entity) {
      return;
    }

    const title = entity.title ?? this.i18n.t('entity.singular');
    const text =
      entity.summary ??
      detailHeroSubtitle(entity, {
        locale: this.i18n.locale(),
        t: (key) => this.i18n.t(key),
      }) ??
      this.i18n.t('entity.shareDefault');
    const url = typeof window !== 'undefined' ? window.location.href : '';

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (!nav) {
      return;
    }

    const payload = { title, text, url };

    if (typeof nav.share === 'function') {
      nav
        .share(payload)
        .then(() => {
          this.saved.openPopup(
            'share',
            this.i18n.t('share.shared'),
            this.i18n.t('share.sharedMessage'),
            {
              autoCloseMs: 2000,
            },
          );
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          this.saved.openPopup(
            'error',
            this.i18n.t('share.failed'),
            this.i18n.t('share.openFailed'),
          );
        });
      return;
    }

    if (nav.clipboard?.writeText && url) {
      nav.clipboard
        .writeText(url)
        .then(() => {
          this.saved.openPopup(
            'share',
            this.i18n.t('share.linkCopied'),
            this.i18n.t('share.linkCopiedMessage'),
            { autoCloseMs: 2200 },
          );
        })
        .catch(() => {
          this.saved.openPopup(
            'error',
            this.i18n.t('share.failed'),
            this.i18n.t('share.copyFailed'),
          );
        });
      return;
    }

    this.saved.openPopup('error', this.i18n.t('share.failed'), this.i18n.t('share.notAvailable'));
  }

  private normalizeWorkspaceMode(value: string | null): DetailWorkspaceMode | null {
    switch ((value ?? '').trim()) {
      case 'split':
      case 'image':
      case 'graph':
      case 'info':
        return value as DetailWorkspaceMode;
      default:
        return null;
    }
  }

  focusTop() {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private saveOrAuthenticate(entity: PublicEntity): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigate(['/login'], {
        queryParams: { redirectTo: `/entity/${entity.slug}` },
      });
      return;
    }

    this.saved.toggleSave(entity.id);
  }

  private slug$ = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    distinctUntilChanged(),
    tap(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      this.currentEntity.set(null);
      this.saved.reset();
    }),
    tap((slug) => {
      if (typeof window === 'undefined') {
        return;
      }

      this.artworkTransition.beginArrivalFromState(
        this.router.getCurrentNavigation()?.extras.state ?? window.history.state,
        slug,
      );
      this.artworkTransition.resumeForSlug(slug);
    }),
  );

  entity$ = combineLatest([this.slug$, toObservable(this.i18n.locale)]).pipe(
    switchMap(([slug]) => this.api.get(slug).pipe(startWith(null))),
    tap((entity) => {
      if (!entity) {
        return;
      }

      if (entity.type !== 'ARTWORK') {
        this.artworkTransition.cancel();
      }

      this.currentEntity.set(entity);
      this.seo.setPageMeta({
        title: `${entity.title} | JANO`,
        description: entity.summary ?? `Explore ${entity.title} in JANO.`,
        path: `/entity/${entity.slug}`,
        image: visualUrl(entity),
      });
      this.saved.resolveSavedStatus(entity.id);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
