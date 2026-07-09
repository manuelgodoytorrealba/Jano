import { ResearchDecisionAction, ResearchProposalReviewState } from '@prisma/client';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ResearchController } from './research.controller';
import { ResearchJobRunnerService } from './research-job-runner.service';
import { ResearchService } from './research.service';

describe('ResearchController', () => {
  const service = {
    getStudioStatus: jest.fn(),
    listProjects: jest.fn(),
    createProject: jest.fn(),
    getProject: jest.fn(),
    searchSources: jest.fn(),
    addProjectSource: jest.fn(),
    prepareSourceJob: jest.fn(),
    extractFindingsJob: jest.fn(),
    createEvidence: jest.fn(),
    createFinding: jest.fn(),
    convertFindingProposalToFinding: jest.fn(),
    reviewFindingProposal: jest.fn(),
    decideFinding: jest.fn(),
  } as unknown as jest.Mocked<ResearchService>;
  const jobRunner = {
    runNextQueuedJob: jest.fn(),
  } as unknown as jest.Mocked<ResearchJobRunnerService>;
  let controller: ResearchController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new ResearchController(service, jobRunner);
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

  it('delegates project creation, list, and detail to the research service', async () => {
    const dto = { title: 'Goya', objective: 'Reunir fuentes' };
    service.createProject.mockResolvedValue({ id: 'project-1' } as never);
    service.listProjects.mockResolvedValue([{ id: 'project-1' }] as never);
    service.getProject.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.create(dto)).resolves.toEqual({ id: 'project-1' });
    await expect(controller.list()).resolves.toEqual([{ id: 'project-1' }]);
    await expect(controller.get('project-1')).resolves.toEqual({ id: 'project-1' });
  });

  it('delegates project source association to the research service', async () => {
    const dto = { sourceId: 'source-1', note: 'Corpus inicial' };
    service.addProjectSource.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.addSource('project-1', dto)).resolves.toEqual({ id: 'project-1' });
    expect(service.addProjectSource).toHaveBeenCalledWith('project-1', dto);
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
    service.extractFindingsJob.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.extractFindings('project-1')).resolves.toEqual({ id: 'project-1' });
    expect(service.extractFindingsJob).toHaveBeenCalledWith('project-1');

    await expect(controller.extractFindingsForSource('project-1', 'source-1')).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.extractFindingsJob).toHaveBeenCalledWith('project-1', 'source-1');
  });

  it('delegates automatic proposal conversion to the research service', async () => {
    service.convertFindingProposalToFinding.mockResolvedValue({ id: 'project-1' } as never);

    await expect(
      controller.convertFindingProposalToFinding('project-1', 'proposal-1'),
    ).resolves.toEqual({ id: 'project-1' });
    expect(service.convertFindingProposalToFinding).toHaveBeenCalledWith('project-1', 'proposal-1');
  });

  it('delegates automatic proposal review to the research service', async () => {
    const dto = { reviewState: ResearchProposalReviewState.REVIEWED };
    service.reviewFindingProposal.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.reviewFindingProposal('project-1', 'proposal-1', dto)).resolves.toEqual(
      {
        id: 'project-1',
      },
    );
    expect(service.reviewFindingProposal).toHaveBeenCalledWith('project-1', 'proposal-1', dto);
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

  it('delegates finding creation to the research service', async () => {
    const dto = { title: 'Hipótesis', evidenceIds: ['evidence-1'] };
    service.createFinding.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.createFinding('project-1', dto)).resolves.toEqual({ id: 'project-1' });
    expect(service.createFinding).toHaveBeenCalledWith('project-1', dto);
  });

  it('delegates finding decisions with the authenticated actor', async () => {
    const req = { user: { userId: 'user-1' } } as never;
    const dto = { action: ResearchDecisionAction.REJECT, note: 'Duplicado' };
    service.decideFinding.mockResolvedValue({ id: 'project-1' } as never);

    await expect(controller.decideFinding(req, 'project-1', 'finding-1', dto)).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.decideFinding).toHaveBeenCalledWith('project-1', 'finding-1', 'user-1', dto);
  });
});
