import { NotFoundException } from '@nestjs/common';
import { ResearchOwnerGuard } from './research-owner.guard';

describe('ResearchOwnerGuard', () => {
  const prisma = { researchProject: { findFirst: jest.fn() } };
  const guard = new ResearchOwnerGuard(prisma as never);
  const context = (userId: string, id: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ params: { id }, user: { userId } }) }),
    }) as never;

  beforeEach(() => jest.resetAllMocks());

  it('allows the owner and hides another owner’s Research', async () => {
    prisma.researchProject.findFirst.mockResolvedValueOnce({ id: 'research-1' });
    await expect(guard.canActivate(context('user-1', 'research-1'))).resolves.toBe(true);

    prisma.researchProject.findFirst.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context('user-2', 'research-1'))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
