import { Module, Global } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoDBStore } from '@langchain/langgraph-checkpoint-mongodb';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MemoryService } from './memory.service';
import { HindsightService } from './hindsight.service';

@Global()
@Module({
  providers: [
    MemoryService,
    HindsightService,
    {
      provide: 'MONGO_STORE',
      inject: [getConnectionToken()],
      useFactory: (connection: Connection) => {
        const client = connection.getClient();

        const store = new MongoDBStore({
          client: client as any,
          embeddings: new GoogleGenerativeAIEmbeddings({
            model: 'gemini-embedding-001',
            apiKey: process.env.GEMINI_API_KEY,
          }),
          indexConfig: {
            name: 'memory_vector_index',
            path: 'embedding', // Where the vector is stored in the document
            embeddingKey: 'summary', // Which field from op.value to extract and embed
            dims: 3072,
          },
        });

        return store;
      },
    },
  ],
  exports: [MemoryService, HindsightService],
})
export class MemoryModule {}