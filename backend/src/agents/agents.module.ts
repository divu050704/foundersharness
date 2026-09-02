import { Logger, Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailThread, EmailThreadSchema } from './schemas/email.schema';
import { SophiaChenService } from './employees/SophiaChen.service';
import { VictorStoneService } from './employees/VictorStone.service';
import { LucasBennettService } from './employees/LucasBennett.service';
import { SamuelCrossService } from './employees/SamuelCross.service';
import { RomanColeService } from './employees/RomanCole.service';
import { AriaMorganService } from './employees/AriaMorgan.service';
import { TylerReedService } from './employees/TylerReed.service';

import { GenerateSocialMediaCalendar } from './graphs/sophia-chen/GenerateSocialMediaCalendar.service';
import { ScoutGrantsAndCapital } from './graphs/victor-stone/ScoutGrantsAndCapital.service';
import { ExecuteBrowserPosting } from './graphs/lucas-bennett/ExecuteBrowserPosting.service';
import { OptimizeFounderCalendar } from './graphs/samuel-cross/OptimizeFounderCalendar.service';
import { ScoutTechEvents } from './graphs/roman-cole/ScoutTechEvents.service';
import { AuditStartupBudget } from './graphs/aria-morgan/AuditStartupBudget.service';
import { AuditSafetyGuardrails } from './graphs/tyler-reed/AuditSafetyGuardrails.service';

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
    SophiaChenService,
    VictorStoneService,
    LucasBennettService,
    SamuelCrossService,
    RomanColeService,
    AriaMorganService,
    TylerReedService,
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
    SophiaChenService,
    VictorStoneService,
    LucasBennettService,
    SamuelCrossService,
    RomanColeService,
    AriaMorganService,
    TylerReedService,
    DeviceHookService,
    UseBrowser,
  ],
})
export class AgentsModule {}
