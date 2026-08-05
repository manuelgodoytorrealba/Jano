import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LibraryService } from './library.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('library')
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get('materials')
  listMaterials() {
    return this.service.listMaterials();
  }

  @Delete('materials/:materialId')
  deleteMaterial(@Param('materialId') materialId: string) {
    return this.service.deleteMaterial(materialId);
  }
}
