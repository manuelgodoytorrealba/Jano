import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports readiness after checking PostgreSQL', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma as never);

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
