import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateContributorDto } from './dto/create-contributor.dto';
import { CreateEntityAliasDto } from './dto/create-entity-alias.dto';
import { CreateEntityDraftDto } from './dto/create-entity-draft.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { CreateSourceRefDto } from './dto/create-source-ref.dto';
import { UpdateContributorDto } from './dto/update-contributor.dto';
import { UpdateEntityAliasDto } from './dto/update-entity-alias.dto';
import { UpdateEntityDetailsDto } from './dto/update-entity-details.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { UpdateSourceRefDto } from './dto/update-source-ref.dto';
import { UpsertEntityTranslationDto } from './dto/upsert-entity-translation.dto';
import { EntityCreditsService } from './entity-credits.service';
import { EntityEditorialService } from './entity-editorial.service';
import { EntityTaxonomyService, type RelationMutationDto } from './entity-taxonomy.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('entities')
export class EntityEditorialController {
  constructor(
    private readonly editorial: EntityEditorialService,
    private readonly taxonomy: EntityTaxonomyService,
    private readonly credits: EntityCreditsService,
  ) {}

  @Post('drafts')
  createDraft(@Body() dto: CreateEntityDraftDto) {
    return this.editorial.createDraft(dto);
  }

  @Post()
  create(@Body() dto: CreateEntityDto) {
    return this.editorial.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.editorial.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.editorial.remove(id);
  }

  @Patch(':id/translations/:locale')
  upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: UpsertEntityTranslationDto,
  ) {
    return this.editorial.upsertTranslation(id, locale, dto);
  }

  @Patch(':id/details')
  updateDetails(@Param('id') id: string, @Body() dto: UpdateEntityDetailsDto) {
    return this.editorial.updateDetails(id, dto);
  }

  @Post(':id/aliases')
  createAlias(@Param('id') id: string, @Body() dto: CreateEntityAliasDto) {
    return this.taxonomy.createAlias(id, dto);
  }

  @Patch(':id/aliases/:aliasId')
  updateAlias(
    @Param('id') id: string,
    @Param('aliasId') aliasId: string,
    @Body() dto: UpdateEntityAliasDto,
  ) {
    return this.taxonomy.updateAlias(id, aliasId, dto);
  }

  @Delete(':id/aliases/:aliasId')
  deleteAlias(@Param('id') id: string, @Param('aliasId') aliasId: string) {
    return this.taxonomy.deleteAlias(id, aliasId);
  }

  @Post(':id/relations')
  createRelation(@Param('id') id: string, @Body() dto: RelationMutationDto) {
    return this.taxonomy.createRelation(id, dto);
  }

  @Patch(':id/relations/:relationId')
  updateRelation(
    @Param('id') id: string,
    @Param('relationId') relationId: string,
    @Body() dto: RelationMutationDto,
  ) {
    return this.taxonomy.updateRelation(id, relationId, dto);
  }

  @Delete(':id/relations/:relationId')
  deleteRelation(@Param('id') id: string, @Param('relationId') relationId: string) {
    return this.taxonomy.deleteRelation(id, relationId);
  }

  @Post(':id/tags')
  addTag(
    @Param('id') id: string,
    @Body() dto: { tagId: string; weight?: number; source?: string },
  ) {
    return this.taxonomy.addTag(id, dto);
  }

  @Delete(':id/tags/:tagId')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.taxonomy.removeTag(id, tagId);
  }

  @Post(':id/source-refs')
  createSourceRef(@Param('id') id: string, @Body() dto: CreateSourceRefDto) {
    return this.credits.createSourceRef(id, dto);
  }

  @Patch(':id/source-refs/:refId')
  updateSourceRef(
    @Param('id') id: string,
    @Param('refId') refId: string,
    @Body() dto: UpdateSourceRefDto,
  ) {
    return this.credits.updateSourceRef(id, refId, dto);
  }

  @Delete(':id/source-refs/:refId')
  deleteSourceRef(@Param('id') id: string, @Param('refId') refId: string) {
    return this.credits.deleteSourceRef(id, refId);
  }

  @Post(':id/contributors')
  createContributor(@Param('id') id: string, @Body() dto: CreateContributorDto) {
    return this.credits.createContributor(id, dto);
  }

  @Patch(':id/contributors/:contributorId')
  updateContributor(
    @Param('id') id: string,
    @Param('contributorId') contributorId: string,
    @Body() dto: UpdateContributorDto,
  ) {
    return this.credits.updateContributor(id, contributorId, dto);
  }

  @Delete(':id/contributors/:contributorId')
  deleteContributor(@Param('id') id: string, @Param('contributorId') contributorId: string) {
    return this.credits.deleteContributor(id, contributorId);
  }
}
