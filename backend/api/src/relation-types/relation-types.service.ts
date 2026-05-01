import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationTypesService {
  constructor(private prisma: PrismaService) {}

  list(options: { includeInactive?: boolean } = {}) {
    return this.prisma.relationType.findMany({
      where: options.includeInactive ? undefined : { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { label: 'asc' },
      ],
    });
  }
}
