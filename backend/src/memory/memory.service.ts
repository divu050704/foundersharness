// memory.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { MongoDBStore } from '@langchain/langgraph-checkpoint-mongodb';

export type MemoryRecord = {
  type: string;          // agent-chosen: 'canvas', 'post_plan', 'email_draft', 'preference'...
  content: unknown;       // any shape
  summary: string;        // short text used for embedding/semantic search
  producedBy: string;     // which agent wrote it
  createdAt: string;
};

function stripUserName(email: string){
    return email.split("@")[0]
}

@Injectable()
export class MemoryService {
  constructor(@Inject('MONGO_STORE') private readonly store: MongoDBStore) {}

  async save(userId: string, record: Omit<MemoryRecord, 'createdAt'>) {
    const strippedUserID = stripUserName(userId)
    const key = `${record.type}-${Date.now()}`;
    await this.store.put([strippedUserID, 'memory'], key, {
      ...record,
      createdAt: new Date().toISOString(),
    });
    return key;
  }

  async recall(userId: string, query: string, type?: string, limit = 5) {
    const strippedUserID = stripUserName(userId)

    const results = await this.store.search([strippedUserID, 'memory'], { query, limit });
    return type ? results.filter((r) => r.value.type === type) : results;
  }

  async getLatestByType(userId: string, type: string) {
    const strippedUserID = stripUserName(userId)

    const all = await this.store.search([strippedUserID, 'memory'], { query: type, limit: 20 });
    return all
      .filter((r) => r.value.type === type)
      .sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0];
  }
}