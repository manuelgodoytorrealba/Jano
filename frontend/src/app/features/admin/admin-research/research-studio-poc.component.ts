import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type Screen =
  | 'new'
  | 'overview'
  | 'library'
  | 'knowledge'
  | 'index'
  | 'context'
  | 'writing'
  | 'review'
  | 'preview'
  | 'settings';

type Edition = 'Spanish' | 'English';
type Perspective = 'reading' | 'graph' | 'entities' | 'sources' | 'related';

type NavigationItem = {
  id: Exclude<Screen, 'new' | 'context' | 'writing'>;
  label: string;
  number: string;
};

@Component({
  standalone: true,
  selector: 'app-research-studio-poc',
  imports: [FormsModule, RouterLink],
  templateUrl: './research-studio-poc.component.html',
  styleUrl: './research-studio-poc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchStudioPocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly title = signal('Goya y la invención de la guerra moderna');
  readonly objective = signal(
    'Explorar cómo Goya convirtió la violencia en una forma de memoria visual.',
  );
  readonly scope = signal('España, 1808–1824');
  readonly screen = signal<Screen>('overview');
  readonly focusedEntity = signal<'Naturaleza' | 'Nilo'>('Naturaleza');
  readonly contextPanelOpen = signal(true);
  readonly selectedEdition = signal<Edition>('Spanish');
  readonly creatingEdition = signal(false);
  readonly readerMode = signal(false);
  readonly navCollapsed = signal(false);
  readonly perspective = signal<Perspective>('reading');

  readonly navigation: NavigationItem[] = [
    { id: 'overview', label: 'Overview', number: '01' },
    { id: 'library', label: 'Biblioteca', number: '02' },
    { id: 'knowledge', label: 'Knowledge', number: '03' },
    { id: 'index', label: 'Índice', number: '04' },
    { id: 'review', label: 'Review', number: '05' },
    { id: 'preview', label: 'Preview', number: '06' },
    { id: 'settings', label: 'Configuración', number: '07' },
  ];

  readonly activeScreen = computed(() => {
    const current = this.screen();
    return current === 'context' || current === 'writing' ? 'index' : current;
  });

  readonly screenLabel = computed(() => {
    const labels: Record<Screen, string> = {
      new: 'Nueva investigación',
      overview: 'Overview',
      library: 'Biblioteca',
      knowledge: 'Knowledge',
      index: 'Índice',
      context: 'Contexto editorial',
      writing: 'Escritura',
      review: 'Review',
      preview: 'Preview',
      settings: 'Configuración',
    };
    return labels[this.screen()];
  });

  readonly editionMeta = computed(() =>
    this.selectedEdition() === 'Spanish'
      ? {
          label: 'Edición en español',
          status: 'Publicada',
          reviewed: 'Publicada hace 3 días',
          title: 'Goya y la invención de la guerra moderna',
          subtitle: 'Cómo una mirada convirtió la violencia en memoria visual.',
        }
      : {
          label: 'English Edition',
          status: 'Primer borrador generado',
          reviewed: 'Última revisión hace 2 horas',
          title: 'Goya and the invention of modern war',
          subtitle: 'How one vision turned violence into visual memory.',
        },
  );

  readonly focusedContext = computed(() =>
    this.focusedEntity() === 'Naturaleza'
      ? {
          name: 'Naturaleza',
          citations: 6,
          sources: 3,
          relations: 4,
          note: 'El paisaje deja de ser escenario y participa en la violencia.',
        }
      : {
          name: 'Nilo',
          citations: 3,
          sources: 2,
          relations: 5,
          note: 'El río articula vida, frontera y continuidad histórica.',
        },
  );

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const screen = params.get('screen');
      this.screen.set(this.isScreen(screen) ? screen : 'overview');
    });
  }

  go(screen: Screen): void {
    void this.router.navigate(['/admin/research/studio', screen]);
  }

  private isScreen(value: string | null): value is Screen {
    return [
      'new',
      'overview',
      'library',
      'knowledge',
      'index',
      'context',
      'writing',
      'review',
      'preview',
      'settings',
    ].includes(value ?? '');
  }
}
