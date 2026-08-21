import { Module, Global } from '@nestjs/common';
import { GeminiModule } from '../onboarding/gemini.module';
import { MongoDbStore } from './mongodb.store';
import { Neo4jStore } from './neo4j.store';
import { TimelineStore } from './timeline.store';
import { ObjectStorage } from './object.storage';
import { ContextBuilder } from './context.builder';
import { MemoryExtractionPipeline } from './pipeline.service';
import { MemoryService } from './memory.service';

import { MemoryController } from './memory.controller';

@Global()
@Module({
  imports: [GeminiModule],
  controllers: [MemoryController],
  providers: [
    MongoDbStore,
    Neo4jStore,
    TimelineStore,
    ObjectStorage,
    ContextBuilder,
    MemoryExtractionPipeline,
    MemoryService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
