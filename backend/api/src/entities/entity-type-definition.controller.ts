import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateEntityTypeDefinitionDto,
  UpdateEntityTypeDefinitionDto,
  UpdateEntityTypeFieldsDto,
} from './dto/entity-type-definition.dto';
import { EntityTypeDefinitionService } from './entity-type-definition.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('entity-types')
export class EntityTypeDefinitionController {
  constructor(private readonly types: EntityTypeDefinitionService) {}
  @Get() list(@Query('active') active?: string) {
    return this.types.list(active !== 'true');
  }
  @Post() create(@Body() dto: CreateEntityTypeDefinitionDto) {
    return this.types.create(dto);
  }
  @Patch(':key') update(@Param('key') key: string, @Body() dto: UpdateEntityTypeDefinitionDto) {
    return this.types.update(key, dto);
  }
  @Patch(':key/fields') replaceFields(
    @Param('key') key: string,
    @Body() dto: UpdateEntityTypeFieldsDto,
  ) {
    return this.types.replaceFields(key, dto.fields);
  }
  @Delete(':key') remove(@Param('key') key: string) {
    return this.types.remove(key);
  }
}
