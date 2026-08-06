import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ResearchAssistantMessageRole } from '@prisma/client';
import { AIProvider, type AIProviderPort } from '../ai/ai.provider';
import { PrismaService } from '../prisma/prisma.service';

const TASK = 'research.section_assistant';
const SCHEMA_VERSION = '1';

type AssistantOutput = {
  answer: string;
  suggestions: Array<{ title: string; rationale: string; excerptIds: string[] }>;
};

@Injectable()
export class ResearchSectionAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AIProvider) private readonly provider: AIProviderPort,
  ) {}

  async get(projectId: string, sectionId: string) {
    const thread = await this.getOrCreateThread(projectId, sectionId);
    const messages = await this.prisma.researchAssistantMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      threadId: thread.id,
      provider: this.provider.metadata(),
      messages: messages.reverse(),
    };
  }

  async suggest(projectId: string, sectionId: string) {
    return this.respond(projectId, sectionId, null);
  }

  async ask(
    projectId: string,
    sectionId: string,
    message: string | undefined,
    conversationStartedAt?: string,
  ) {
    const text = message?.trim();
    if (!text) throw new BadRequestException('La pregunta para el asistente es obligatoria');
    return this.respond(
      projectId,
      sectionId,
      text,
      conversationStartedAt ? new Date(conversationStartedAt) : undefined,
    );
  }

  private async respond(
    projectId: string,
    sectionId: string,
    question: string | null,
    conversationStartedAt?: Date,
  ) {
    if (!this.provider.isAvailable()) throw new BadRequestException('Ollama no está disponible');
    const thread = await this.getOrCreateThread(projectId, sectionId);
    const context = await this.buildContext(projectId, sectionId);
    const previous = await this.prisma.researchAssistantMessage.findMany({
      where: {
        threadId: thread.id,
        ...(conversationStartedAt ? { createdAt: { gte: conversationStartedAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { role: true, content: true },
    });
    const snapshot = {
      ...context,
      question,
      previous: question
        ? previous
            .reverse()
            .slice(-4)
            .map((item) => ({ ...item, content: item.content.slice(0, 600) }))
        : [],
    };
    if (question) {
      await this.prisma.researchAssistantMessage.create({
        data: {
          threadId: thread.id,
          role: ResearchAssistantMessageRole.USER,
          content: question,
          snapshot: snapshot,
        },
      });
    }

    const metadata = this.provider.metadata();
    const execution = await this.prisma.aIExecution.create({
      data: {
        projectId,
        task: TASK,
        provider: metadata.provider,
        model: metadata.model,
        providerVersion: metadata.version ?? null,
        input: snapshot,
      },
      select: { id: true },
    });
    try {
      const result = await this.provider.runStructured({
        task: TASK,
        schemaVersion: SCHEMA_VERSION,
        input: {
          context: snapshot,
          outputContract: question
            ? 'Devuelve {answer:string,suggestions:[{title:string,rationale:string,excerptIds:string[]}]}. Responde a la pregunta y propone hasta 3 siguientes pasos concretos.'
            : 'Devuelve {answer:string,suggestions:[{title:string,rationale:string,excerptIds:string[]}]}. answer debe ser una cadena vacía. Genera exactamente 3 preguntas de investigación abiertas, distintas y concretas. title debe ser una pregunta; rationale explica brevemente por qué importa.',
        },
      });
      const output = this.validateOutput(
        result.output,
        context.excerpts.map((excerpt) => excerpt.id),
        3,
      );
      if (!question) output.answer = '';
      const assistant = question
        ? await this.prisma.researchAssistantMessage.create({
            data: {
              threadId: thread.id,
              role: ResearchAssistantMessageRole.ASSISTANT,
              content: output.answer || output.suggestions.map((item) => item.title).join('\n'),
              snapshot: { ...snapshot, output },
            },
          })
        : null;
      await this.prisma.aIExecution.update({
        where: { id: execution.id },
        data: {
          output: output,
          durationMs: result.durationMs ?? null,
          costCents: result.costCents ?? null,
        },
      });
      return { message: assistant, output, provider: metadata };
    } catch (error) {
      await this.prisma.aIExecution.update({
        where: { id: execution.id },
        data: { error: error instanceof Error ? error.message : 'AI execution failed' },
      });
      throw error;
    }
  }

  private async getOrCreateThread(projectId: string, sectionId: string) {
    const section = await this.prisma.researchOutlineSection.findFirst({
      where: { id: sectionId, projectId },
      select: { id: true },
    });
    if (!section) throw new NotFoundException('Research section not found');
    return this.prisma.researchAssistantThread.upsert({
      where: { projectId_sectionId: { projectId, sectionId } },
      create: { projectId, sectionId },
      update: {},
      select: { id: true },
    });
  }

  private async buildContext(projectId: string, sectionId: string) {
    const section = await this.prisma.researchOutlineSection.findFirst({
      where: { id: sectionId, projectId },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        drafts: {
          where: { archivedAt: null },
          include: { currentRevision: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        excerptReferences: {
          include: {
            libraryExcerpt: { include: { materialVersion: { include: { material: true } } } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        materialReferences: {
          include: {
            materialVersion: {
              include: { material: true, excerpts: { orderBy: { createdAt: 'asc' }, take: 4 } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!section) throw new NotFoundException('Research section not found');
    const excerptMap = new Map<
      string,
      { id: string; locator: string; text: string; materialTitle: string }
    >();
    for (const item of section.excerptReferences) {
      const excerpt = item.libraryExcerpt;
      excerptMap.set(excerpt.id, {
        id: excerpt.id,
        locator: excerpt.locator,
        text: excerpt.text.slice(0, 1400),
        materialTitle: excerpt.materialVersion.material.title,
      });
    }
    for (const reference of section.materialReferences)
      for (const excerpt of reference.materialVersion.excerpts) {
        if (!excerptMap.has(excerpt.id))
          excerptMap.set(excerpt.id, {
            id: excerpt.id,
            locator: excerpt.locator,
            text: excerpt.text.slice(0, 1400),
            materialTitle: reference.materialVersion.material.title,
          });
      }
    return {
      section: {
        id: section.id,
        title: section.title,
        objective: section.objective,
        notes: section.notes,
      },
      questions: section.questions.map((item) => item.text),
      materials: section.materialReferences.map((item) => ({
        title: item.materialVersion.material.title,
        kind: item.materialVersion.material.kind,
        version: item.materialVersion.version,
      })),
      excerpts: [...excerptMap.values()].slice(0, 8),
      draft: section.drafts[0]?.currentRevision?.content.slice(0, 6000) ?? null,
    };
  }

  private validateOutput(
    value: unknown,
    knownExcerptIds: string[],
    maxSuggestions: number,
  ): AssistantOutput {
    if (!value || typeof value !== 'object') throw new Error('Respuesta de IA inválida');
    const raw = value as Record<string, unknown>;
    const answer = typeof raw.answer === 'string' ? raw.answer.trim().slice(0, 1800) : '';
    if (!Array.isArray(raw.suggestions)) throw new Error('La IA no devolvió sugerencias');
    const known = new Set(knownExcerptIds);
    const suggestions = raw.suggestions.slice(0, maxSuggestions).map((value) => {
      const item = value as Record<string, unknown>;
      const title = typeof item.title === 'string' ? item.title.trim().slice(0, 240) : '';
      const rationale =
        typeof item.rationale === 'string' ? item.rationale.trim().slice(0, 700) : '';
      if (!title || !rationale) throw new Error('Una sugerencia de IA no es válida');
      const excerptIds = Array.isArray(item.excerptIds)
        ? [
            ...new Set(
              item.excerptIds.filter((id): id is string => typeof id === 'string' && known.has(id)),
            ),
          ]
        : [];
      return { title, rationale, excerptIds };
    });
    if (!suggestions.length) {
      throw new Error('La IA no devolvió las preguntas solicitadas');
    }
    return { answer, suggestions };
  }
}
