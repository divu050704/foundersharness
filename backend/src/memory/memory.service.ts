import { Injectable, Logger } from '@nestjs/common';
import { MongoDbStore } from './mongodb.store';
import { Neo4jStore } from './neo4j.store';
import { QdrantStore } from './qdrant.store';
import { TimelineStore } from './timeline.store';
import { ContextBuilder } from './context.builder';
import { MemoryExtractionPipeline } from './pipeline.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly mongodbStore: MongoDbStore,
    private readonly neo4jStore: Neo4jStore,
    private readonly qdrantStore: QdrantStore,
    private readonly timelineStore: TimelineStore,
    private readonly contextBuilder: ContextBuilder,
    private readonly pipeline: MemoryExtractionPipeline,
  ) {}

  /**
   * MongoDB Atlas (Source of truth) for company facts
   */
  async getCompany() {
    return this.mongodbStore.getCompany();
  }

  /**
   * MongoDB Atlas (Source of truth) for specific entities
   */
  async getEntity(type: string, name: string) {
    return this.mongodbStore.getEntity(type, name);
  }

  /**
   * MongoDB Atlas (Source of truth) for listing entities of a type (or all)
   */
  async listEntities(type?: string) {
    return this.mongodbStore.listEntities(type);
  }

  /**
   * Qdrant (Vector Database) search for unstructured information
   */
  async search(query: string, limit?: number) {
    return this.qdrantStore.search(query, limit);
  }

  /**
   * Timeline DB search for events
   */
  async timeline(limit?: number) {
    return this.timelineStore.getTimeline(limit);
  }

  /**
   * Neo4j (Knowledge Graph) relations for a given entity name
   */
  async related(entityName: string) {
    return this.neo4jStore.getRelated(entityName);
  }

  /**
   * Expose whole raw graph for visualizations
   */
  async getGraph() {
    return this.neo4jStore.getGraph();
  }

  /**
   * Direct update mechanism
   */
  async update(entityType: string, entityName: string, data: any) {
    if (entityType.toLowerCase() === 'company') {
      return this.mongodbStore.updateCompany(data);
    }
    return this.mongodbStore.updateEntity(entityType, entityName, data);
  }

  /**
   * Add a direct graph node
   */
  async addNode(id: string, label: string, properties: Record<string, any> = {}) {
    return this.neo4jStore.addNode({ id, label, properties });
  }

  /**
   * Add a direct graph relationship
   */
  async addRelationship(source: string, relation: string, target: string, properties: Record<string, any> = {}) {
    return this.neo4jStore.addRelationship(source, relation, target, properties);
  }

  /**
   * Add a direct timeline event
   */
  async addTimelineEvent(date: string, title: string, description: string, confidence = 1.0, source = 'Manual') {
    return this.timelineStore.addEvent({ date, title, description, confidence, source });
  }

  /**
   * Direct ingestion method for documents
   */
  async ingestDocument(
    title: string,
    content: string,
    category: 'onboarding' | 'meeting' | 'pitch' | 'note',
    metadata: Record<string, any> = {},
  ) {
    return this.pipeline.ingestDocument(title, content, category, metadata);
  }

  /**
   * Context Builder - retrieves and merges context into one prompt snippet
   */
  async buildContext(query: string): Promise<string> {
    return this.contextBuilder.buildContext(query);
  }

  /**
   * Clears the entire database (useful for reset)
   */
  async resetMemory() {
    this.logger.warn('Resetting simulated business memory stores...');
    await this.neo4jStore.clear();
    await this.timelineStore.clear();
    await this.mongodbStore.clear();
    
    // Reset local fallback and vector store files
    const fs = require('fs');
    const path = require('path');
    const fbPath = path.resolve(process.cwd(), 'data', 'mongodb_fallback.json');
    const qdPath = path.resolve(process.cwd(), 'data', 'qdrant.json');
    
    fs.writeFileSync(fbPath, JSON.stringify({ company: null, entities: [] }, null, 2));
    fs.writeFileSync(qdPath, JSON.stringify({ documents: [] }, null, 2));
    
    // Clear storage folder files
    const storageDir = path.resolve(process.cwd(), 'data', 'storage');
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      for (const file of files) {
        fs.unlinkSync(path.join(storageDir, file));
      }
    }
  }
}
