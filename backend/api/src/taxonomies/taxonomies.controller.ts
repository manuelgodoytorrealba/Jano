import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTaxonomyDto, CreateTaxonomyTermDto } from './dto/taxonomy.dto';
import { TaxonomiesService } from './taxonomies.service';

@Controller('taxonomies')
export class TaxonomiesController {
  constructor(private readonly service: TaxonomiesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.service.get(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':key/terms')
  createTerm(@Param('key') key: string, @Body() dto: CreateTaxonomyTermDto) {
    return this.service.createTerm(key, dto);
  }
}
