import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCitationDto } from './dto/create-citation.dto';
import { UpdateCitationDto } from './dto/update-citation.dto';
import { CitationsService } from './citations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller()
export class CitationsController {
  constructor(private readonly service: CitationsService) {}
  @Patch('citations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCitationDto) {
    return this.service.update(id, dto);
  }
  @Delete('citations/:id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get('entities/:id/citations')
  listEntity(@Param('id') id: string) {
    return this.service.list('entity', id);
  }
  @Post('entities/:id/citations') createEntity(
    @Param('id') id: string,
    @Body() dto: CreateCitationDto,
  ) {
    return this.service.create('entity', id, dto);
  }
  @Get('relations/:id/citations')
  listRelation(@Param('id') id: string) {
    return this.service.list('relation', id);
  }
  @Post('relations/:id/citations') createRelation(
    @Param('id') id: string,
    @Body() dto: CreateCitationDto,
  ) {
    return this.service.create('relation', id, dto);
  }
  @Get('entity-attributes/:id/citations')
  listAttribute(@Param('id') id: string) {
    return this.service.list('attribute', id);
  }
  @Post('entity-attributes/:id/citations') createAttribute(
    @Param('id') id: string,
    @Body() dto: CreateCitationDto,
  ) {
    return this.service.create('attribute', id, dto);
  }
}
