import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResearchOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const projectId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    if (!projectId) return true;

    const project = await this.prisma.researchProject.findFirst({
      where: { id: projectId, ownerId: request.user.userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Research project not found');
    return true;
  }
}
