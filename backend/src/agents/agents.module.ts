import { Injectable, Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailThread, EmailThreadSchema } from './schemas/email.schema';
import { PamelaMillerService } from './employees/PamelaMiller.service';
import { HindsightService } from '../memory/hindsight.service';
import { GenerateSocialMediaCalendar } from './graphs/pamela-miller/GenerateSocialMediaCalendar.service';
import { UseBrowser } from '../browser/use-browser.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [ MongooseModule.forFeature([{name: EmailThread.name, schema: EmailThreadSchema}])],
  controllers: [AgentsController],
  providers: [AgentsService, PamelaMillerService, HindsightService, GenerateSocialMediaCalendar, UseBrowser, Logger],
  exports: [AgentsService, PamelaMillerService, GenerateSocialMediaCalendar],
})
export class AgentsModule {}
