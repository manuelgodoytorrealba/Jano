import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateAttributeDefinitionDto, CreateEntityAttributeDto } from './dto/attribute.dto';
import { UpdateEntityAttributeDto } from './dto/update-entity-attribute.dto';
import { AttributesService } from './attributes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller()
export class AttributesController {
  constructor(private readonly service: AttributesService) {}
  @Get('attribute-definitions') listDefinitions() {
    return this.service.listDefinitions();
  }
  @Post('attribute-definitions') createDefinition(@Body() dto: CreateAttributeDefinitionDto) {
    return this.service.createDefinition(dto);
  }
  @Get('entities/:id/attributes')
  listEntityAttributes(@Param('id') id: string) {
    return this.service.listEntityAttributes(id);
  }

  @Patch('entity-attributes/:id')
  updateEntityAttribute(@Param('id') id: string, @Body() dto: UpdateEntityAttributeDto) {
    return this.service.updateEntityAttribute(id, dto);
  }

  @Delete('entity-attributes/:id')
  deleteEntityAttribute(@Param('id') id: string) {
    return this.service.deleteEntityAttribute(id);
  }

  @Post('entities/:id/attributes') createEntityAttribute(
    @Param('id') id: string,
    @Body() dto: CreateEntityAttributeDto,
  ) {
    return this.service.createEntityAttribute(id, dto);
  }
}
