import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntitiesModule } from './entities/entities.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SavedModule } from './saved/saved.module';
import { CollectionsModule } from './collections/collections.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { HomeDecksModule } from './home-decks/home-decks.module';
import { SearchModule } from './search/search.module';
import { RelationTypesModule } from './relation-types/relation-types.module';
import { TagsModule } from './tags/tags.module';
import { TaxonomiesModule } from './taxonomies/taxonomies.module';
import { AttributesModule } from './attributes/attributes.module';
import { CitationsModule } from './citations/citations.module';
import { SourcesModule } from './sources/sources.module';
import { CuratedModule } from './curated/curated.module';
import { ResearchModule } from './research/research.module';
import { validateEnv } from './config/env.validation';
import { LibraryModule } from './library/library.module';
import { HealthController } from './health.controller';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    EntitiesModule,
    UsersModule,
    AuthModule,
    SavedModule,
    CollectionsModule,
    AppSettingsModule,
    HomeDecksModule,
    SearchModule,
    RelationTypesModule,
    TagsModule,
    TaxonomiesModule,
    AttributesModule,
    CitationsModule,
    SourcesModule,
    CuratedModule,
    ResearchModule,
    LibraryModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
