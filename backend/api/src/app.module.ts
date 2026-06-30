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
import { CuratedModule } from './curated/curated.module';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health.controller';

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
    CuratedModule,
  ],
})
export class AppModule {}
