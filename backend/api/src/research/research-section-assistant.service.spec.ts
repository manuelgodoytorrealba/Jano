import type { PrismaService } from '../prisma/prisma.service';
import { ResearchSectionAssistantService } from './research-section-assistant.service';

describe('ResearchSectionAssistantService', () => {
  const prisma = {
    researchOutlineSection: { findFirst: jest.fn() },
    researchAssistantThread: { upsert: jest.fn() },
    researchAssistantMessage: { findMany: jest.fn(), create: jest.fn() },
    aIExecution: { create: jest.fn(), update: jest.fn() },
  };
  const provider = { isAvailable: jest.fn(), metadata: jest.fn(), runStructured: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('asks only with the section dossier and retains the generated snapshot', async () => {
    provider.isAvailable.mockReturnValue(true);
    provider.metadata.mockReturnValue({ provider: 'ollama', model: 'qwen2.5:7b' });
    prisma.researchOutlineSection.findFirst
      .mockResolvedValueOnce({ id: 'section-1' })
      .mockResolvedValueOnce({
        id: 'section-1',
        title: 'Oscuridad',
        objective: 'Examinar la paleta',
        notes: null,
        questions: [{ text: '¿Qué sostiene la inquietud?' }],
        drafts: [],
        excerptReferences: [],
        materialReferences: [
          {
            materialVersion: {
              version: 1,
              material: { title: 'Nota', kind: 'TEXT' },
              excerpts: [
                { id: 'excerpt-1', locator: 'párrafo 1', text: 'Negros y ocres reducen la luz.' },
              ],
            },
          },
        ],
      });
    prisma.researchAssistantThread.upsert.mockResolvedValue({ id: 'thread-1' });
    prisma.researchAssistantMessage.findMany.mockResolvedValue([]);
    prisma.researchAssistantMessage.create
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({
        id: 'assistant-1',
        role: 'ASSISTANT',
        content: 'Respuesta',
        snapshot: {},
        createdAt: new Date(),
      });
    prisma.aIExecution.create.mockResolvedValue({ id: 'execution-1' });
    provider.runStructured.mockResolvedValue({
      output: {
        answer: 'Respuesta',
        suggestions: [
          {
            title: 'Comparar la luz',
            rationale: 'El extracto permite analizar el contraste.',
            excerptIds: ['excerpt-1'],
          },
        ],
      },
    });

    const service = new ResearchSectionAssistantService(
      prisma as unknown as PrismaService,
      provider,
    );
    const result = await service.ask('project-1', 'section-1', '¿Qué falta?');

    expect(provider.runStructured).toHaveBeenCalledWith(
      expect.objectContaining({ task: 'research.section_assistant' }),
    );
    expect(result.output.suggestions[0].excerptIds).toEqual(['excerpt-1']);
    expect(prisma.researchAssistantMessage.create).toHaveBeenCalledTimes(2);
  });

  it('loads the most recent messages in chronological order', async () => {
    prisma.researchOutlineSection.findFirst.mockResolvedValue({ id: 'section-1' });
    prisma.researchAssistantThread.upsert.mockResolvedValue({ id: 'thread-1' });
    prisma.researchAssistantMessage.findMany.mockResolvedValue([{ id: 'newest' }, { id: 'older' }]);
    provider.metadata.mockReturnValue({ provider: 'ollama', model: 'qwen2.5:7b' });

    const service = new ResearchSectionAssistantService(
      prisma as unknown as PrismaService,
      provider,
    );
    const result = await service.get('project-1', 'section-1');

    expect(prisma.researchAssistantMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    );
    expect(result.messages).toEqual([{ id: 'older' }, { id: 'newest' }]);
  });
});
