import { Logger, Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailThread, EmailThreadSchema } from './schemas/email.schema';
import { PamelaMillerService } from './employees/PamelaMiller.service';
import { DerrickVanceService } from './employees/DerrickVance.service';
import { JimmyHarperService } from './employees/JimmyHarper.service';
import { StanHayesService } from './employees/StanHayes.service';
import { RoryHowardService } from './employees/RoryHoward.service';
import { AngelicaMartinService } from './employees/AngelicaMartin.service';
import { TobiasHendersonService } from './employees/TobiasHenderson.service';

import { GenerateSocialMediaCalendar } from './graphs/pamela-miller/GenerateSocialMediaCalendar.service';
import { ScoutGrantsAndCapital } from './graphs/derrick-vance/ScoutGrantsAndCapital.service';
import { ExecuteBrowserPosting } from './graphs/jimmy-harper/ExecuteBrowserPosting.service';
import { OptimizeFounderCalendar } from './graphs/stan-hayes/OptimizeFounderCalendar.service';
import { ScoutTechEvents } from './graphs/rory-howard/ScoutTechEvents.service';
import { AuditStartupBudget } from './graphs/angelica-martin/AuditStartupBudget.service';
import { AuditSafetyGuardrails } from './graphs/tobias-henderson/AuditSafetyGuardrails.service';

import { UseBrowser } from '../browser/use-browser.service';
import { DeviceHookService } from '../browser/device-hook.service';
import { BullModule } from '@nestjs/bullmq';
import { AgentTaskProcessor } from './agent-task.processor';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EmailThread.name, schema: EmailThreadSchema }]),
    BullModule.registerQueue({
      name: 'agent-tasks',
    }),
    MemoryModule,
  ],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    // Employees
    PamelaMillerService,
    DerrickVanceService,
    JimmyHarperService,
    StanHayesService,
    RoryHowardService,
    AngelicaMartinService,
    TobiasHendersonService,
    // Graphs
    GenerateSocialMediaCalendar,
    ScoutGrantsAndCapital,
    ExecuteBrowserPosting,
    OptimizeFounderCalendar,
    ScoutTechEvents,
    AuditStartupBudget,
    AuditSafetyGuardrails,
    // Utilities & Workers
    UseBrowser,
    DeviceHookService,
    AgentTaskProcessor,
    Logger
  ],
  exports: [
    AgentsService,
    PamelaMillerService,
    DerrickVanceService,
    JimmyHarperService,
    StanHayesService,
    RoryHowardService,
    AngelicaMartinService,
    TobiasHendersonService,
    DeviceHookService,
    UseBrowser,
  ],
})
export class AgentsModule {}
