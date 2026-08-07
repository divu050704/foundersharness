import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

@Injectable()
export class Neo4jStore {
  private readonly logger = new Logger(Neo4jStore.name);
  private readonly dbPath = path.resolve(process.cwd(), 'data', 'neo4j.json');

  constructor() {
    this.ensureDbExists();
  }

  private ensureDbExists() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(
        this.dbPath,
        JSON.stringify({ nodes: [], edges: [] }, null, 2),
        'utf8',
      );
    }
  }

  private readDb(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    try {
      this.ensureDbExists();
      const content = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      this.logger.error('Failed to read Neo4j simulated database', e);
      return { nodes: [], edges: [] };
    }
  }

  private writeDb(data: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    try {
      this.ensureDbExists();
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Failed to write Neo4j simulated database', e);
    }
  }

  async addNode(node: GraphNode): Promise<void> {
    const db = this.readDb();
    const index = db.nodes.findIndex((n) => n.id.toLowerCase() === node.id.toLowerCase());
    if (index !== -1) {
      db.nodes[index] = {
        ...db.nodes[index],
        properties: { ...db.nodes[index].properties, ...node.properties },
      };
    } else {
      db.nodes.push(node);
    }
    this.writeDb(db);
  }

  async addRelationship(
    source: string,
    relation: string,
    target: string,
    properties: Record<string, any> = {},
  ): Promise<void> {
    const db = this.readDb();
    
    // Ensure source and target nodes exist (create default placeholder if missing)
    const sourceId = source.trim();
    const targetId = target.trim();

    if (!db.nodes.some((n) => n.id.toLowerCase() === sourceId.toLowerCase())) {
      db.nodes.push({ id: sourceId, label: 'Concept', properties: {} });
    }
    if (!db.nodes.some((n) => n.id.toLowerCase() === targetId.toLowerCase())) {
      db.nodes.push({ id: targetId, label: 'Concept', properties: {} });
    }

    const edgeExists = db.edges.some(
      (e) =>
        e.source.toLowerCase() === sourceId.toLowerCase() &&
        e.target.toLowerCase() === targetId.toLowerCase() &&
        e.type.toLowerCase() === relation.toLowerCase(),
    );

    if (!edgeExists) {
      db.edges.push({
        source: sourceId,
        target: targetId,
        type: relation,
        properties,
      });
      this.writeDb(db);
    }
  }

  async getRelated(entityName: string): Promise<any[]> {
    const db = this.readDb();
    const searchId = entityName.toLowerCase();
    
    const results: any[] = [];

    // Find outgoing relationships
    db.edges.forEach((edge) => {
      if (edge.source.toLowerCase() === searchId) {
        results.push({
          type: 'outgoing',
          relation: edge.type,
          target: edge.target,
          properties: edge.properties,
        });
      } else if (edge.target.toLowerCase() === searchId) {
        results.push({
          type: 'incoming',
          relation: edge.type,
          source: edge.source,
          properties: edge.properties,
        });
      }
    });

    return results;
  }

  async getGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    return this.readDb();
  }

  async clear(): Promise<void> {
    this.writeDb({ nodes: [], edges: [] });
  }
}
