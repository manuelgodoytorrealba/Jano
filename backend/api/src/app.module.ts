import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntitiesModule } from './entities/entities.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SavedModule } from './saved/saved.module';
import { CollectionsModule } from './collections/collections.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EntitiesModule,
    UsersModule,
    AuthModule,
    SavedModule,
    CollectionsModule,
  ],
})
export class AppModule { }