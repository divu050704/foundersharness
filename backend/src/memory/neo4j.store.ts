import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';


export interface Properties {
  key: string;
  value: string;
}


export interface PropertyMap {
  [key: string]: string;
}


export interface GraphNode {
  id: string;
  label: string;
  properties: PropertyMap;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: PropertyMap;
}


export interface ExtractedGraph {
  nodes: {
    id: string;
    label: string;
    properties: Properties[];
  }[];

  edges: {
    source: string;
    target: string;
    type: string;
    properties: Properties[];
  }[];
}

@Injectable()
export class Neo4jStore {
  private readonly logger = new Logger(Neo4jStore.name);

  private readonly dbPath = path.resolve(
    process.cwd(),
    'data',
    'neo4j.json',
  );

  constructor() {
    this.ensureDbExists();
  }

  
  private ensureDbExists(): void {
    const dir = path.dirname(this.dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(
        this.dbPath,
        JSON.stringify(
          {
            nodes: [],
            edges: [],
          },
          null,
          2,
        ),
        'utf8',
      );
    }
  }

  
  private readDb(): {
    nodes: GraphNode[];
    edges: GraphEdge[];
  } {
    try {
      this.ensureDbExists();

      const content = fs.readFileSync(this.dbPath, 'utf8');

      return JSON.parse(content);
    } catch (error) {
      this.logger.error(
        'Failed to read simulated Neo4j database',
        error,
      );

      return {
        nodes: [],
        edges: [],
      };
    }
  }

  
  private writeDb(data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  }): void {
    try {
      this.ensureDbExists();

      fs.writeFileSync(
        this.dbPath,
        JSON.stringify(data, null, 2),
        'utf8',
      );
    } catch (error) {
      this.logger.error(
        'Failed to write simulated Neo4j database',
        error,
      );
    }
  }


  
  private keyValueArrayToObject(
    properties: Properties[],
  ): PropertyMap {
    return Object.fromEntries(
      properties.map(({ key, value }) => [
        key,
        value,
      ]),
    );
  }

  async addNode(node: GraphNode): Promise<void> {
    const db = this.readDb();

    const index = db.nodes.findIndex(
      (n) =>
        n.id.toLowerCase() === node.id.toLowerCase(),
    );

    if (index !== -1) {
      db.nodes[index] = {
        ...db.nodes[index],
        label: node.label,
        properties: {
          ...db.nodes[index].properties,
          ...node.properties,
        },
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
    properties: PropertyMap = {},
  ): Promise<void> {
    const db = this.readDb();

    const sourceId = source.trim();
    const targetId = target.trim();

    /**
     * Ensure source exists.
     */
    if (
      !db.nodes.some(
        (n) =>
          n.id.toLowerCase() === sourceId.toLowerCase(),
      )
    ) {
      db.nodes.push({
        id: sourceId,
        label: 'Concept',
        properties: {},
      });
    }

    
    if (
      !db.nodes.some(
        (n) =>
          n.id.toLowerCase() === targetId.toLowerCase(),
      )
    ) {
      db.nodes.push({
        id: targetId,
        label: 'Concept',
        properties: {},
      });
    }

    const edgeExists = db.edges.some(
      (e) =>
        e.source.toLowerCase() ===
        sourceId.toLowerCase() &&
        e.target.toLowerCase() ===
        targetId.toLowerCase() &&
        e.type.toLowerCase() ===
        relation.toLowerCase(),
    );

    
    if (!edgeExists) {
      db.edges.push({
        source: sourceId,
        target: targetId,
        type: relation,
        properties,
      });
    }

    
    this.writeDb(db);
  }

 
  async getRelated(entityName: string): Promise<
    {
      type: 'outgoing' | 'incoming';
      relation: string;
      target?: string;
      source?: string;
      properties: PropertyMap;
    }[]
  > {
    const db = this.readDb();

    const searchId = entityName.trim().toLowerCase();

    const results: {
      type: 'outgoing' | 'incoming';
      relation: string;
      target?: string;
      source?: string;
      properties: PropertyMap;
    }[] = [];

    
    db.edges.forEach((edge) => {
      if (
        edge.source.toLowerCase() === searchId
      ) {
        results.push({
          type: 'outgoing',
          relation: edge.type,
          target: edge.target,
          properties: edge.properties,
        });
      }

      if (
        edge.target.toLowerCase() === searchId
      ) {
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

  async getGraph(): Promise<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }> {
    return this.readDb();
  }


  async clear(): Promise<void> {
    this.writeDb({
      nodes: [],
      edges: [],
    });
  }

  
  
  async saveGraph(
    graph: ExtractedGraph,
  ): Promise<void> {
    const db = this.readDb();

    
    for (const node of graph.nodes) {
      const nodeId = node.id.trim();

      if (!nodeId) {
        continue;
      }

      const properties =
        this.keyValueArrayToObject(
          node.properties,
        );

      const index = db.nodes.findIndex(
        (n) =>
          n.id.toLowerCase() ===
          nodeId.toLowerCase(),
      );

      if (index !== -1) {
        db.nodes[index] = {
          ...db.nodes[index],

          label: node.label,

          properties: {
            ...db.nodes[index].properties,
            ...properties,
          },
        };
      }

      else {
        db.nodes.push({
          id: nodeId,
          label: node.label,
          properties,
        });
      }
    }

    for (const edge of graph.edges) {
      const sourceId = edge.source.trim();
      const targetId = edge.target.trim();
      const edgeType = edge.type.trim();

      if (!sourceId || !targetId || !edgeType) {
        continue;
      }

      
      const properties =
        this.keyValueArrayToObject(
          edge.properties,
        );

      
      const sourceExists = db.nodes.some(
        (n) =>
          n.id.toLowerCase() ===
          sourceId.toLowerCase(),
      );

      if (!sourceExists) {
        db.nodes.push({
          id: sourceId,
          label: 'Concept',
          properties: {},
        });
      }

      
      const targetExists = db.nodes.some(
        (n) =>
          n.id.toLowerCase() ===
          targetId.toLowerCase(),
      );

      if (!targetExists) {
        db.nodes.push({
          id: targetId,
          label: 'Concept',
          properties: {},
        });
      }

      
      const edgeExists = db.edges.some(
        (e) =>
          e.source.toLowerCase() ===
          sourceId.toLowerCase() &&
          e.target.toLowerCase() ===
          targetId.toLowerCase() &&
          e.type.toLowerCase() ===
          edgeType.toLowerCase(),
      );

      
      if (!edgeExists) {
        db.edges.push({
          source: sourceId,
          target: targetId,
          type: edgeType,
          properties,
        });
      }

      
      else {
        const existingEdge =
          db.edges.find(
            (e) =>
              e.source.toLowerCase() ===
              sourceId.toLowerCase() &&
              e.target.toLowerCase() ===
              targetId.toLowerCase() &&
              e.type.toLowerCase() ===
              edgeType.toLowerCase(),
          );

        if (existingEdge) {
          existingEdge.properties = {
            ...existingEdge.properties,
            ...properties,
          };
        }
      }
    }

    
    this.writeDb(db);
  }
}