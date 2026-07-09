import { Module } from '@nestjs/common';
import { AIProvider } from './ai.provider';

@Module({
  providers: [AIProvider],
  exports: [AIProvider],
})
export class AIModule {}
