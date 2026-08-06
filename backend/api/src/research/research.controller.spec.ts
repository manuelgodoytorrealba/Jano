import { ResearchProposalReviewState } from '@prisma/client';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ResearchController } from './research.controller';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';
import { ResearchDraftService } from './research-draft.service';
import { ResearchSectionAssistantService } from './research-section-assistant.service';

describe('ResearchController', () => {
  const service = {
    getStudioStatus: jest.fn(),
    listProjects: jest.fn(),
    createProject: jest.fn(),
    getProject: jest.fn(),
    searchSources: jest.fn(),
    addProjectSource: jest.fn(),
    associateLibraryMaterial: jest.fn(),
    removeLibraryMaterial: jest.fn(),
    prepareSourceJob: jest.fn(),
    getKnowledge: jest.fn(),
    extractProposalsJob: jest.fn(),
    createEvidence: jest.fn(),
    createFinding: jest.fn(),
    convertProposalToClaim: jest.fn(),
    reviewProposal: jest.fn(),
    decideFinding: jest.fn(),
  } as unknown as jest.Mocked<ResearchService>;
  const jobRunner = {
    runNextQueuedJob: jest.fn(),
  } as unknown as jest.Mocked<ResearchJobRunnerService>;
  const drafts = {
    create: jest.fn(),
    revise: jest.fn(),
  } as unknown as jest.Mocked<ResearchDraftService>;
  const assistant = {
    get: jest.fn(),
    suggest: jest.fn(),
    ask: jest.fn(),
  } as unknown as jest.Mocked<ResearchSectionAssistantService>;
  let controller: ResearchController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new ResearchController(service, jobRunner, drafts, assistant);
  });

  it('is admin-only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ResearchController)).toEqual(['ADMIN']);
  });

  it('exposes studio status without touching canonical domains', () => {
    service.getStudioStatus.mockReturnValue({
      status: 'ready',
      scope: 'editorial-research-studio',
    });

    expect(controller.status()).toEqual({
      status: 'ready',
      scope: 'editorial-research-studio',
    });
  });

  it('does not expose direct promotion routes into the Knowledge Core', () => {
    expect(ResearchController.prototype).not.toHaveProperty('promoteFindingToEntity');
    expect(ResearchController.prototype).not.toHaveProperty('promoteEntity');
    expect(ResearchController.prototype).not.toHaveProperty('promoteRelation');
    expect(ResearchController.prototype).not.toHaveProperty('createFinding');
    expect(ResearchController.prototype).not.toHaveProperty('decideFinding');
  });

  it('delegates project creation, list, and detail to the research service', async () => {
    const dto = { title: 'Goya', objective: 'Reunir fuentes' };
    service.createProject.mockResolvedValue({ id: 'project-1' } as never);
    service.listProjects.mockResolvedValue([{ id: 'project-1' }] as never);
    service.getProject.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.create({ user: { userId: 'user-1' } } as never, dto)).resolves.toEqual({
      id: 'project-1',
    });
    await expect(controller.list({ user: { userId: 'user-1' } } as never)).resolves.toEqual([
      { id: 'project-1' },
    ]);
    await expect(controller.get('project-1')).resolves.toEqual({ id: 'project-1' });
  });

  it('delegates the derived knowledge read model to its dedicated reader', async () => {
    service.getKnowledge.mockResolvedValue({ projectId: 'project-1' } as never);

    await expect(controller.knowledge('project-1', {})).resolves.toEqual({
      projectId: 'project-1',
    });
    expect(service.getKnowledge).toHaveBeenCalledWith('project-1', {});
  });

  it('delegates project source association to the research service', async () => {
    const dto = { sourceId: 'source-1', note: 'Corpus inicial' };
    service.addProjectSource.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.addSource('project-1', dto)).resolves.toEqual({ id: 'project-1' });
    expect(service.addProjectSource).toHaveBeenCalledWith('project-1', dto);
  });

  it('delegates Library material association to the research service', async () => {
    const dto = { materialId: 'material-1' };
    service.associateLibraryMaterial.mockResolvedValue(dto as never);

    await expect(controller.associateLibraryMaterial('project-1', dto)).resolves.toEqual(dto);
    expect(service.associateLibraryMaterial).toHaveBeenCalledWith('project-1', dto);
  });

  it('delegates removal from the research corpus without deleting the Library material', async () => {
    service.removeLibraryMaterial.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.removeLibraryMaterial('project-1', 'material-1')).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.removeLibraryMaterial).toHaveBeenCalledWith('project-1', 'material-1');
  });

  it('delegates canonical source search to the research service', async () => {
    const query = { q: 'Prado', limit: 5 };
    service.searchSources.mockResolvedValue([{ id: 'source-1' }] as never);

    await expect(controller.searchSources(query)).resolves.toEqual([{ id: 'source-1' }]);
    expect(service.searchSources).toHaveBeenCalledWith(query);
  });

  it('delegates manual queued job execution to the local runner', async () => {
    jobRunner.runNextQueuedJob.mockResolvedValue({ processed: false });

    await expect(controller.runNextJob()).resolves.toEqual({ processed: false });
    expect(jobRunner.runNextQueuedJob).toHaveBeenCalledWith();
  });

  it('delegates source preparation job creation to the research service', async () => {
    service.prepareSourceJob.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.prepareSource('project-1', 'source-1')).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.prepareSourceJob).toHaveBeenCalledWith('project-1', 'source-1');
  });

  it('delegates finding extraction job creation to the research service', async () => {
    service.extractProposalsJob.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.extractProposals('project-1')).resolves.toEqual({ id: 'project-1' });
    expect(service.extractProposalsJob).toHaveBeenCalledWith('project-1');

    await expect(controller.extractProposalsForSource('project-1', 'source-1')).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.extractProposalsJob).toHaveBeenCalledWith('project-1', 'source-1');
  });

  it('delegates automatic proposal conversion to the research service', async () => {
    service.convertProposalToClaim.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.convertProposalToClaim('project-1', 'proposal-1')).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.convertProposalToClaim).toHaveBeenCalledWith('project-1', 'proposal-1');
  });

  it('delegates automatic proposal review to the research service', async () => {
    const dto = { reviewState: ResearchProposalReviewState.REVIEWED };
    service.reviewProposal.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.reviewProposal('project-1', 'proposal-1', dto)).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.reviewProposal).toHaveBeenCalledWith('project-1', 'proposal-1', dto);
  });

  it('delegates evidence creation to the research service', async () => {
    const dto = {
      sourceId: 'source-1',
      sourceVersion: 'v1',
      locator: 'p. 1',
      quote: 'Fragmento',
    };
    service.createEvidence.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.createEvidence('project-1', dto)).resolves.toEqual({ id: 'project-1' });
    expect(service.createEvidence).toHaveBeenCalledWith('project-1', dto);
  });
});
