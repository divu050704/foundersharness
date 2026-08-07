import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

export interface EntityRecord {
  type: string;
  name: string;
  data: Record<string, any>;
  confidence: number;
  source: string;
  createdAt: string;
  verified: boolean;
}

export interface CompanyRecord {
  name: string;
  product: string;
  stage: string;
  teamSize?: number;
  goals: string[];
  bottlenecks: string[];
  tools: string[];
  rawAnswers?: Record<string, any>;
}

@Injectable()
export class MongoDbStore implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDbStore.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isFallbackMode = false;
  private readonly fallbackPath = path.resolve(process.cwd(), 'data', 'mongodb_fallback.json');

  constructor() {
    this.ensureFallbackDbExists();
  }

  async onModuleInit() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('placeholder')) {
      this.logger.warn('MONGODB_URI is not configured or is a placeholder. Using local JSON fallback mode.');
      this.isFallbackMode = true;
      return;
    }

    try {
      this.logger.log('Connecting to MongoDB Atlas...');
      this.client = new MongoClient(mongoUri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      await this.client.connect();
      this.db = this.client.db();
      
      // Ping check
      await this.db.command({ ping: 1 });
      this.logger.log('Successfully connected to MongoDB Atlas database!');
      
      // Ensure indexes for efficient queries
      await this.db.collection('entities').createIndex({ type: 1, name: 1 }, { unique: true });
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB Atlas. Falling back to local storage mode.', error);
      this.isFallbackMode = true;
      this.client = null;
      this.db = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('MongoDB Atlas connection closed.');
    }
  }

  // --- Fallback Storage Helpers ---
  private ensureFallbackDbExists() {
    const dir = path.dirname(this.fallbackPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.fallbackPath)) {
      fs.writeFileSync(
        this.fallbackPath,
        JSON.stringify({ company: null, entities: [] }, null, 2),
        'utf8',
      );
    }
  }

  private readFallback(): { company: CompanyRecord | null; entities: EntityRecord[] } {
    try {
      this.ensureFallbackDbExists();
      const content = fs.readFileSync(this.fallbackPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      this.logger.error('Failed to read fallback storage', e);
      return { company: null, entities: [] };
    }
  }

  private writeFallback(data: { company: CompanyRecord | null; entities: EntityRecord[] }) {
    try {
      this.ensureFallbackDbExists();
      fs.writeFileSync(this.fallbackPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Failed to write fallback storage', e);
    }
  }

  // --- API Interface Methods ---
  async getCompany(): Promise<CompanyRecord | null> {
    if (this.isFallbackMode || !this.db) {
      const db = this.readFallback();
      return db.company;
    }

    try {
      const company = await this.db.collection<CompanyRecord>('company').findOne({});
      return company;
    } catch (error) {
      this.logger.error('MongoDB error in getCompany', error);
      const db = this.readFallback();
      return db.company;
    }
  }

  async updateCompany(companyData: Partial<CompanyRecord>): Promise<CompanyRecord> {
    if (this.isFallbackMode || !this.db) {
      const db = this.readFallback();
      const current = db.company || {
        name: 'My Startup',
        product: '',
        stage: '',
        goals: [],
        bottlenecks: [],
        tools: [],
      };
      db.company = { ...current, ...companyData };
      this.writeFallback(db);
      return db.company;
    }

    try {
      const current = await this.getCompany() || {
        name: 'My Startup',
        product: '',
        stage: '',
        goals: [],
        bottlenecks: [],
        tools: [],
      };
      const updated = { ...current, ...companyData };
      
      // Update or insert (UPSERT)
      await this.db.collection('company').replaceOne({}, updated, { upsert: true });
      return updated as CompanyRecord;
    } catch (error) {
      this.logger.error('MongoDB error in updateCompany', error);
      // Fallback update as safety net
      const db = this.readFallback();
      const current = db.company || {
        name: 'My Startup',
        product: '',
        stage: '',
        goals: [],
        bottlenecks: [],
        tools: [],
      };
      db.company = { ...current, ...companyData };
      this.writeFallback(db);
      return db.company;
    }
  }

  async getEntity(type: string, name: string): Promise<EntityRecord | null> {
    if (this.isFallbackMode || !this.db) {
      const db = this.readFallback();
      const entity = db.entities.find(
        (e) => e.type.toLowerCase() === type.toLowerCase() && e.name.toLowerCase() === name.toLowerCase(),
      );
      return entity || null;
    }

    try {
      // Case-insensitive search on type and name
      const entity = await this.db.collection<EntityRecord>('entities').findOne({
        type: { $regex: new RegExp(`^${type}$`, 'i') },
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });
      return entity;
    } catch (error) {
      this.logger.error('MongoDB error in getEntity', error);
      const db = this.readFallback();
      const entity = db.entities.find(
        (e) => e.type.toLowerCase() === type.toLowerCase() && e.name.toLowerCase() === name.toLowerCase(),
      );
      return entity || null;
    }
  }

  async updateEntity(
    type: string,
    name: string,
    data: Partial<EntityRecord>,
  ): Promise<EntityRecord> {
    const now = new Date().toISOString().split('T')[0];
    const newRecord: EntityRecord = {
      type,
      name,
      data: data.data || {},
      confidence: data.confidence !== undefined ? data.confidence : 1.0,
      source: data.source || 'Manual Input',
      createdAt: data.createdAt || now,
      verified: data.verified !== undefined ? data.verified : true,
    };

    if (this.isFallbackMode || !this.db) {
      const db = this.readFallback();
      const index = db.entities.findIndex(
        (e) => e.type.toLowerCase() === type.toLowerCase() && e.name.toLowerCase() === name.toLowerCase(),
      );

      if (index !== -1) {
        db.entities[index] = {
          ...db.entities[index],
          ...newRecord,
          data: { ...db.entities[index].data, ...newRecord.data },
        };
        this.writeFallback(db);
        return db.entities[index];
      } else {
        db.entities.push(newRecord);
        this.writeFallback(db);
        return newRecord;
      }
    }

    try {
      const current = await this.getEntity(type, name);
      const mergedRecord = current 
        ? { ...current, ...newRecord, data: { ...current.data, ...newRecord.data } }
        : newRecord;

      // Remove mongodb internal _id if it exists to prevent modifications on immutable fields
      const { _id, ...cleanRecord } = mergedRecord as any;

      await this.db.collection('entities').replaceOne(
        {
          type: { $regex: new RegExp(`^${type}$`, 'i') },
          name: { $regex: new RegExp(`^${name}$`, 'i') },
        },
        cleanRecord,
        { upsert: true },
      );
      return cleanRecord as EntityRecord;
    } catch (error) {
      this.logger.error('MongoDB error in updateEntity', error);
      // Fallback
      const db = this.readFallback();
      const index = db.entities.findIndex(
        (e) => e.type.toLowerCase() === type.toLowerCase() && e.name.toLowerCase() === name.toLowerCase(),
      );
      if (index !== -1) {
        db.entities[index] = {
          ...db.entities[index],
          ...newRecord,
          data: { ...db.entities[index].data, ...newRecord.data },
        };
        this.writeFallback(db);
        return db.entities[index];
      } else {
        db.entities.push(newRecord);
        this.writeFallback(db);
        return newRecord;
      }
    }
  }

  async listEntities(type?: string): Promise<EntityRecord[]> {
    if (this.isFallbackMode || !this.db) {
      const db = this.readFallback();
      if (type) {
        return db.entities.filter((e) => e.type.toLowerCase() === type.toLowerCase());
      }
      return db.entities;
    }

    try {
      const query = type ? { type: { $regex: new RegExp(`^${type}$`, 'i') } } : {};
      const entities = await this.db.collection<EntityRecord>('entities').find(query).toArray();
      return entities;
    } catch (error) {
      this.logger.error('MongoDB error in listEntities', error);
      const db = this.readFallback();
      if (type) {
        return db.entities.filter((e) => e.type.toLowerCase() === type.toLowerCase());
      }
      return db.entities;
    }
  }

  async clear(): Promise<void> {
    if (this.isFallbackMode || !this.db) {
      this.writeFallback({ company: null, entities: [] });
      return;
    }

    try {
      await this.db.collection('company').deleteMany({});
      await this.db.collection('entities').deleteMany({});
    } catch (error) {
      this.logger.error('MongoDB error in clear', error);
      this.writeFallback({ company: null, entities: [] });
    }
  }
}
