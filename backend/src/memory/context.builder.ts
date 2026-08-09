import { Injectable, Logger } from '@nestjs/common';
import { MongoDbStore } from './mongodb.store';
import { Neo4jStore } from './neo4j.store';
import { QdrantStore } from './qdrant.store';
import { TimelineStore } from './timeline.store';

@Injectable()
export class ContextBuilder {
  private readonly logger = new Logger(ContextBuilder.name);

  constructor(
    private readonly mongodbStore: MongoDbStore,
    private readonly neo4jStore: Neo4jStore,
    private readonly qdrantStore: QdrantStore,
    private readonly timelineStore: TimelineStore,
  ) {}

  /**
   * Retrieves relevant memory records from all memory modules (Mongo, Neo4j, Qdrant, Timeline)
   * and formats them into a single context payload ready for LLM consumption.
   */
  async buildContext(query: string): Promise<string> {
    this.logger.log(`Building context for query: "${query}"`);

    // 1. Get structured company overview from MongoDB
    const company = await this.mongodbStore.getCompany();

    // 2. Query Qdrant for semantic matches
    const relevantDocs = await this.qdrantStore.search(query, 4);

    // 3. Query MongoDB for entities related to query keywords
    const allEntities = await this.mongodbStore.listEntities();
    const queryLower = query.toLowerCase();
    const matchedEntities = allEntities.filter(
      (ent) =>
        queryLower.includes(ent.name.toLowerCase()) ||
        queryLower.includes(ent.type.toLowerCase()) ||
        (ent.data &&
          Object.values(ent.data).some(
            (val) =>
              typeof val === 'string' && queryLower.includes(val.toLowerCase()),
          )),
    );

    // 4. Retrieve Graph relations from Neo4j for matched entities
    const graphRelationships: any[] = [];
    const entityNames = new Set<string>();

    // Extract potential node matches directly from query
    allEntities.forEach((ent) => {
      if (queryLower.includes(ent.name.toLowerCase())) {
        entityNames.add(ent.name);
      }
    });

    for (const name of entityNames) {
      const relations = await this.neo4jStore.getRelated(name);
      graphRelationships.push({ entity: name, relations });
    }

    // 5. Get recent timeline logs
    const timelineEvents = await this.timelineStore.getTimeline(5);

    // 6. Format everything into a cohesive LLM prompt component
    let contextStr = '=== SYSTEM BUSINESS MEMORY ENGINE ===\n\n';

    // A. MongoDB Company Stats
    if (company) {
      contextStr += `## Company Profile (Source of Truth)\n`;
      contextStr += `Name: ${company.name}\n`;
      contextStr += `Stage: ${company.stage}\n`;
      contextStr += `Product Focus: ${company.product}\n`;
      if (company.teamSize) {
        contextStr += `Team Size: ${company.teamSize}\n`;
      }
      if (company.goals && company.goals.length > 0) {
        contextStr += `Top Priorities:\n${company.goals.map((g) => `  - ${g}`).join('\n')}\n`;
      }
      if (company.bottlenecks && company.bottlenecks.length > 0) {
        contextStr += `Top Bottlenecks:\n${company.bottlenecks.map((b) => `  - ${b}`).join('\n')}\n`;
      }
      if (company.tools && company.tools.length > 0) {
        contextStr += `Tool Stack: ${company.tools.join(', ')}\n`;
      }
      contextStr += '\n';
    }

    // B. Matched Entities
    if (matchedEntities.length > 0) {
      contextStr += `## Structured Entities Identified\n`;
      matchedEntities.forEach((ent) => {
        contextStr += `[${ent.type}] ${ent.name} (Source: ${ent.source}, Confidence: ${(ent.confidence * 100).toFixed(0)}%)\n`;
        contextStr += `Properties: ${JSON.stringify(ent.data, null, 2)}\n`;
      });
      contextStr += '\n';
    }

    // C. Knowledge Graph Connections
    if (graphRelationships.length > 0) {
      contextStr += `## Semantic Relationships (Knowledge Graph)\n`;
      graphRelationships.forEach(({ entity, relations }) => {
        if (relations && relations.length > 0) {
          relations.forEach((rel: any) => {
            if (rel.type === 'outgoing') {
              contextStr += `  (${entity}) --[${rel.relation}]--> (${rel.target})\n`;
            } else {
              contextStr += `  (${rel.source}) --[${rel.relation}]--> (${entity})\n`;
            }
          });
        }
      });
      contextStr += '\n';
    }

    // D. Unstructured Passages (Vector DB)
    if (relevantDocs.length > 0) {
      contextStr += `## Relevant Unstructured Information (Vector Search)\n`;
      relevantDocs.forEach((doc, idx) => {
        contextStr += `[Match #${idx + 1}] Title: ${doc.title} | Category: ${doc.category} | Date: ${doc.createdAt}\n`;
        contextStr += `Excerpt: "${doc.content}"\n\n`;
      });
    }

    // E. Timeline Events
    if (timelineEvents.length > 0) {
      contextStr += `## Chronological Timeline\n`;
      timelineEvents.forEach((ev) => {
        contextStr += `  - [${ev.date}] ${ev.title}: ${ev.description}\n`;
      });
      contextStr += '\n';
    }

    contextStr += '=======================================\n';
    return contextStr;
  }
}
