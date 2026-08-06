import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import {
  ResearchApi,
  ResearchAssistantMessage,
  ResearchAssistantResponse,
  ResearchAssistantSuggestion,
} from '../../../core/api/research.api';

@Component({
  standalone: true,
  selector: 'app-research-section-assistant',
  imports: [FormsModule],
  templateUrl: './research-section-assistant.component.html',
  styleUrl: './research-section-assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchSectionAssistantComponent implements OnChanges {
  private readonly api = inject(ResearchApi);
  private readonly cdr = inject(ChangeDetectorRef);
  @Input({ required: true }) projectId = '';
  @Input({ required: true }) sectionId = '';
  @Input() materialCount = 0;
  @Input() questionCount = 0;
  @Input() excerptCount = 0;

  messages: ResearchAssistantMessage[] = [];
  suggestions: ResearchAssistantSuggestion[] = [];
  prompt = '';
  provider = '';
  loading = false;
  error = '';
  conversationStarted = false;
  conversationStartedAt: string | null = null;

  ngOnChanges(): void {
    if (!this.projectId || !this.sectionId) return;
    this.messages = [];
    this.suggestions = this.readSuggestions();
    this.conversationStartedAt = this.readSessionValue('started-at');
    this.conversationStarted = this.readSessionValue('view') === 'chat';
    this.load();
  }

  generateSuggestions(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.messages = [];
    this.suggestions = [];
    this.conversationStarted = false;
    this.writeSessionValue('view', 'questions');
    this.api
      .suggestForSection(this.projectId, this.sectionId)
      .pipe(timeout(70_000))
      .subscribe({
        next: (response) => this.accept(response),
        error: () =>
          this.fail('No se pudieron generar sugerencias. Comprueba que Ollama esté disponible.'),
      });
  }

  ask(): void {
    const message = this.prompt.trim();
    if (message) this.askMessage(message);
  }

  submitOnEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.ask();
  }

  askSuggestion(suggestion: ResearchAssistantSuggestion): void {
    this.askMessage(suggestion.title);
  }

  newConversation(): void {
    this.messages = [];
    this.error = '';
    this.conversationStarted = false;
    this.conversationStartedAt = new Date().toISOString();
    this.writeSessionValue('started-at', this.conversationStartedAt);
    this.writeSessionValue('view', 'questions');
    this.cdr.markForCheck();
  }

  generateOtherQuestions(): void {
    this.newConversation();
    this.generateSuggestions();
  }

  private askMessage(message: string): void {
    if (!message || this.loading) return;
    this.loading = true;
    this.error = '';
    this.conversationStarted = true;
    this.writeSessionValue('view', 'chat');
    this.prompt = '';
    this.messages = [
      ...this.messages,
      {
        id: `local-${Date.now()}`,
        role: 'USER',
        content: message,
        snapshot: {},
        createdAt: new Date().toISOString(),
      },
    ];
    this.cdr.markForCheck();
    this.api
      .askSectionAssistant(
        this.projectId,
        this.sectionId,
        message,
        this.conversationStartedAt ?? undefined,
      )
      .pipe(timeout(70_000))
      .subscribe({
        next: (response) => {
          if (response.message) this.messages = [...this.messages, response.message];
          this.accept(response, false);
        },
        error: () => this.fail('No se pudo consultar al asistente.'),
      });
  }

  private load(): void {
    this.api.getSectionAssistant(this.projectId, this.sectionId).subscribe({
      next: (assistant) => {
        this.provider = assistant.provider.provider === 'ollama' ? assistant.provider.model : '';
        if (this.conversationStarted) {
          this.messages = assistant.messages.filter(
            (message) =>
              !this.conversationStartedAt || message.createdAt >= this.conversationStartedAt,
          );
        } else if (!this.conversationStartedAt && assistant.messages.length) {
          this.messages = assistant.messages;
          this.conversationStarted = true;
          this.writeSessionValue('view', 'chat');
        }
        this.cdr.markForCheck();
      },
      error: () => (this.error = 'No se pudo cargar el hilo de esta sección.'),
    });
  }

  private accept(response: ResearchAssistantResponse, append = true): void {
    this.loading = false;
    this.provider = response.provider.model;
    if (append) {
      this.suggestions = response.output.suggestions;
      this.writeSuggestions();
    }
    this.cdr.markForCheck();
  }

  private fail(message: string): void {
    this.loading = false;
    this.error = message;
    this.cdr.markForCheck();
  }

  private readSessionValue(name: string): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(this.sessionKey(name));
  }

  private writeSessionValue(name: string, value: string): void {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(this.sessionKey(name), value);
  }

  private readSuggestions(): ResearchAssistantSuggestion[] {
    const value = this.readSessionValue('suggestions');
    if (!value) return [];
    try {
      const suggestions = JSON.parse(value);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch {
      return [];
    }
  }

  private writeSuggestions(): void {
    this.writeSessionValue('suggestions', JSON.stringify(this.suggestions));
  }

  private sessionKey(name: string): string {
    return `jano.research-assistant.${this.projectId}.${this.sectionId}.${name}`;
  }
}
