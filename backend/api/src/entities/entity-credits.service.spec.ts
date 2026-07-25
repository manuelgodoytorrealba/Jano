import { EntityCreditsService } from './entity-credits.service';

describe('EntityCreditsService', () => {
  it('removes a reference without deleting its canonical source', async () => {
    const prisma = {
      sourceRef: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ref-1', sourceId: 'source-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'ref-1' }),
      },
      source: { delete: jest.fn() },
    };
    const service = new EntityCreditsService(prisma as never);

    await expect(service.deleteSourceRef('entity-1', 'ref-1')).resolves.toEqual({ ok: true });

    expect(prisma.sourceRef.delete).toHaveBeenCalledWith({ where: { id: 'ref-1' } });
    expect(prisma.source.delete).not.toHaveBeenCalled();
  });
});
