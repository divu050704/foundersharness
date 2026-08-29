import { Injectable, Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { GeminiModule } from '../onboarding/gemini.module';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailThread, EmailThreadSchema } from './schemas/email.schema';

@Module({
  imports: [GeminiModule, MongooseModule.forFeature([{name: EmailThread.name, schema: EmailThreadSchema}])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
