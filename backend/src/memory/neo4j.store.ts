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

export interface UserGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Database {
  users: Record<string, UserGraph>;
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

  /**
   * Ensure database directory and file exist.
   */
  private ensureDbExists(): void {
    const dir = path.dirname(this.dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }

    if (!fs.existsSync(this.dbPath)) {
      const initialDb: Database = {
        users: {},
      };

      fs.writeFileSync(
        this.dbPath,
        JSON.stringify(initialDb, null, 2),
        'utf8',
      );
    }
  }

  /**
   * Read the complete database.
   */
  private readDb(): Database {
    try {
      this.ensureDbExists();

      const content = fs.readFileSync(
        this.dbPath,
        'utf8',
      );

      const parsed = JSON.parse(content);

      /**
       * Basic protection against an invalid/old
       * database structure.
       */
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.users ||
        typeof parsed.users !== 'object'
      ) {
        return {
          users: {},
        };
      }

      return parsed as Database;
    } catch (error) {
      this.logger.error(
        'Failed to read simulated Neo4j database',
        error,
      );

      return {
        users: {},
      };
    }
  }

  /**
   * Write the complete database.
   */
  private writeDb(data: Database): void {
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

  /**
   * Get a user's graph.
   *
   * Creates an empty graph if the user does not
   * have one yet.
   */
  private getUserGraph(
    db: Database,
    userId: string,
  ): UserGraph {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw new Error('userId is required');
    }

    if (!db.users[normalizedUserId]) {
      db.users[normalizedUserId] = {
        nodes: [],
        edges: [],
      };
    }

    return db.users[normalizedUserId];
  }

  /**
   * Convert:
   *
   * [
   *   { key: 'name', value: 'Apple' }
   * ]
   *
   * into:
   *
   * {
   *   name: 'Apple'
   * }
   */
  private keyValueArrayToObject(
    properties: Properties[] = [],
  ): PropertyMap {
    return Object.fromEntries(
      properties.map(({ key, value }) => [
        key,
        value,
      ]),
    );
  }

  /**
   * Find a node by ID.
   */
  private findNode(
    graph: UserGraph,
    nodeId: string,
  ): GraphNode | undefined {
    const normalizedId = nodeId.trim().toLowerCase();

    return graph.nodes.find(
      (node) =>
        node.id.trim().toLowerCase() ===
        normalizedId,
    );
  }

  /**
   * Find an edge.
   */
  private findEdge(
    graph: UserGraph,
    source: string,
    target: string,
    type: string,
  ): GraphEdge | undefined {
    const normalizedSource =
      source.trim().toLowerCase();

    const normalizedTarget =
      target.trim().toLowerCase();

    const normalizedType =
      type.trim().toLowerCase();

    return graph.edges.find(
      (edge) =>
        edge.source.trim().toLowerCase() ===
          normalizedSource &&
        edge.target.trim().toLowerCase() ===
          normalizedTarget &&
        edge.type.trim().toLowerCase() ===
          normalizedType,
    );
  }

  /**
   * Add or update a node for a specific user.
   */
  async addNode(
    userId: string,
    node: GraphNode,
  ): Promise<void> {
    const db = this.readDb();

    const graph = this.getUserGraph(
      db,
      userId,
    );

    const nodeId = node.id.trim();

    if (!nodeId) {
      return;
    }

    const existingNode = this.findNode(
      graph,
      nodeId,
    );

    if (existingNode) {
      existingNode.label = node.label;

      existingNode.properties = {
        ...existingNode.properties,
        ...node.properties,
      };
    } else {
      graph.nodes.push({
        id: nodeId,
        label: node.label,
        properties: node.properties ?? {},
      });
    }

    this.writeDb(db);
  }

  /**
   * Add a relationship for a specific user.
   *
   * If source or target nodes don't exist,
   * they are automatically created as Concept nodes.
   */
  async addRelationship(
    userId: string,
    source: string,
    relation: string,
    target: string,
    properties: PropertyMap = {},
  ): Promise<void> {
    const db = this.readDb();

    const graph = this.getUserGraph(
      db,
      userId,
    );

    const sourceId = source.trim();
    const targetId = target.trim();
    const edgeType = relation.trim();

    if (
      !sourceId ||
      !targetId ||
      !edgeType
    ) {
      return;
    }

    /**
     * Ensure source exists.
     */
    if (!this.findNode(graph, sourceId)) {
      graph.nodes.push({
        id: sourceId,
        label: 'Concept',
        properties: {},
      });
    }

    /**
     * Ensure target exists.
     */
    if (!this.findNode(graph, targetId)) {
      graph.nodes.push({
        id: targetId,
        label: 'Concept',
        properties: {},
      });
    }

    /**
     * Check whether relationship already exists.
     */
    const existingEdge = this.findEdge(
      graph,
      sourceId,
      targetId,
      edgeType,
    );

    if (existingEdge) {
      existingEdge.properties = {
        ...existingEdge.properties,
        ...properties,
      };
    } else {
      graph.edges.push({
        source: sourceId,
        target: targetId,
        type: edgeType,
        properties,
      });
    }

    this.writeDb(db);
  }

  /**
   * Get relationships connected to an entity
   * for a specific user.
   */
  async getRelated(
    userId: string,
    entityName: string,
  ): Promise<
    {
      type: 'outgoing' | 'incoming';
      relation: string;
      target?: string;
      source?: string;
      properties: PropertyMap;
    }[]
  > {
    const db = this.readDb();

    const graph = this.getUserGraph(
      db,
      userId,
    );

    const searchId =
      entityName.trim().toLowerCase();

    const results: {
      type: 'outgoing' | 'incoming';
      relation: string;
      target?: string;
      source?: string;
      properties: PropertyMap;
    }[] = [];

    graph.edges.forEach((edge) => {
      /**
       * Outgoing:
       *
       * Apple -> founded_by -> Steve Jobs
       */
      if (
        edge.source.trim().toLowerCase() ===
        searchId
      ) {
        results.push({
          type: 'outgoing',
          relation: edge.type,
          target: edge.target,
          properties: edge.properties,
        });
      }

      /**
       * Incoming:
       *
       * Steve Jobs <- founded_by <- Apple
       */
      if (
        edge.target.trim().toLowerCase() ===
        searchId
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

  /**
   * Get the complete graph for a specific user.
   */
  async getGraph(
    userId: string,
  ): Promise<UserGraph> {
    const db = this.readDb();

    const normalizedUserId =
      userId.trim();

    if (!normalizedUserId) {
      throw new Error('userId is required');
    }

    return (
      db.users[normalizedUserId] ?? {
        nodes: [],
        edges: [],
      }
    );
  }

  /**
   * Clear only one user's graph.
   */
  async clear(
    userId: string,
  ): Promise<void> {
    const db = this.readDb();

    const normalizedUserId =
      userId.trim();

    if (!normalizedUserId) {
      throw new Error('userId is required');
    }

    db.users[normalizedUserId] = {
      nodes: [],
      edges: [],
    };

    this.writeDb(db);
  }

  /**
   * Delete a user's entire graph.
   */
  async deleteUserGraph(
    userId: string,
  ): Promise<void> {
    const db = this.readDb();

    const normalizedUserId =
      userId.trim();

    if (!normalizedUserId) {
      throw new Error('userId is required');
    }

    delete db.users[normalizedUserId];

    this.writeDb(db);
  }

  /**
   * Save an extracted graph for a specific user.
   *
   * Existing nodes and relationships are merged.
   */
  async saveGraph(
    userId: string,
    graph: ExtractedGraph,
  ): Promise<void> {
    const db = this.readDb();

    const dbGraph = this.getUserGraph(
      db,
      userId,
    );

    /**
     * ============================
     * NODES
     * ============================
     */
    for (const node of graph.nodes) {
      const nodeId = node.id.trim();

      if (!nodeId) {
        continue;
      }

      const properties =
        this.keyValueArrayToObject(
          node.properties,
        );

      const existingNode = this.findNode(
        dbGraph,
        nodeId,
      );

      if (existingNode) {
        existingNode.label = node.label;

        existingNode.properties = {
          ...existingNode.properties,
          ...properties,
        };
      } else {
        dbGraph.nodes.push({
          id: nodeId,
          label: node.label,
          properties,
        });
      }
    }

    /**
     * ============================
     * EDGES
     * ============================
     */
    for (const edge of graph.edges) {
      const sourceId =
        edge.source.trim();

      const targetId =
        edge.target.trim();

      const edgeType =
        edge.type.trim();

      if (
        !sourceId ||
        !targetId ||
        !edgeType
      ) {
        continue;
      }

      const properties =
        this.keyValueArrayToObject(
          edge.properties,
        );

      /**
       * Make sure source exists.
       */
      if (
        !this.findNode(
          dbGraph,
          sourceId,
        )
      ) {
        dbGraph.nodes.push({
          id: sourceId,
          label: 'Concept',
          properties: {},
        });
      }

      /**
       * Make sure target exists.
       */
      if (
        !this.findNode(
          dbGraph,
          targetId,
        )
      ) {
        dbGraph.nodes.push({
          id: targetId,
          label: 'Concept',
          properties: {},
        });
      }

      /**
       * Find existing relationship.
       */
      const existingEdge =
        this.findEdge(
          dbGraph,
          sourceId,
          targetId,
          edgeType,
        );

      if (existingEdge) {
        existingEdge.properties = {
          ...existingEdge.properties,
          ...properties,
        };
      } else {
        dbGraph.edges.push({
          source: sourceId,
          target: targetId,
          type: edgeType,
          properties,
        });
      }
    }

    this.writeDb(db);
  }
}