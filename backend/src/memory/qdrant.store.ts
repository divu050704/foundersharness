import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface VectorDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

@Injectable()
export class QdrantStore {
  private readonly logger = new Logger(QdrantStore.name);
  private readonly dbPath = path.resolve(process.cwd(), 'data', 'qdrant.json');

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
        JSON.stringify({ documents: [] }, null, 2),
        'utf8',
      );
    }
  }

  private readDb(): { documents: VectorDocument[] } {
    try {
      this.ensureDbExists();
      const content = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      this.logger.error('Failed to read Qdrant simulated database', e);
      return { documents: [] };
    }
  }

  private writeDb(data: { documents: VectorDocument[] }) {
    try {
      this.ensureDbExists();
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Failed to write Qdrant simulated database', e);
    }
  }

  async addDocument(
    title: string,
    content: string,
    category: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const db = this.readDb();
    const id = `${category.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDoc: VectorDocument = {
      id,
      title,
      content,
      category,
      metadata,
      createdAt: new Date().toISOString(),
    };
    db.documents.push(newDoc);
    this.writeDb(db);
    this.logger.log(`Document indexed in Qdrant store: [${category}] ${title}`);
  }

  async search(query: string, limit = 5): Promise<any[]> {
    const db = this.readDb();
    if (db.documents.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return db.documents.slice(0, limit);

    // Compute TF-IDF vector space
    const corpus = db.documents.map((d) =>
      this.tokenize(d.content + ' ' + d.title),
    );
    const vocab = Array.from(new Set(corpus.flat()));

    // Calculate Document Frequency (DF) for IDF calculation
    const df: Record<string, number> = {};
    vocab.forEach((term) => {
      df[term] = corpus.filter((doc) => doc.includes(term)).length;
    });

    const N = corpus.length;
    const idf: Record<string, number> = {};
    vocab.forEach((term) => {
      idf[term] = Math.log((N + 1) / (df[term] + 1)) + 1;
    });

    // Represent documents as TF-IDF vectors
    const docVectors = db.documents.map((doc, idx) => {
      const tokens = corpus[idx];
      const tf: Record<string, number> = {};
      tokens.forEach((t) => {
        tf[t] = (tf[t] || 0) + 1;
      });

      const vector: Record<string, number> = {};
      vocab.forEach((term) => {
        if (tf[term]) {
          vector[term] = tf[term] * idf[term];
        }
      });
      return vector;
    });

    // Represent query as TF-IDF vector
    const queryTf: Record<string, number> = {};
    queryTokens.forEach((t) => {
      queryTf[t] = (queryTf[t] || 0) + 1;
    });

    const queryVector: Record<string, number> = {};
    vocab.forEach((term) => {
      if (queryTf[term]) {
        queryVector[term] = queryTf[term] * idf[term];
      }
    });

    // Compute Cosine Similarity
    const scoredDocs = db.documents.map((doc, idx) => {
      const docVec = docVectors[idx];
      const score = this.cosineSimilarity(queryVector, docVec);
      return { ...doc, score };
    });

    // Sort by score descending and filter out zero scores unless query is short and we want general matches
    return scoredDocs
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((token) => token.length > 2); // filter out small stop-like words
  }

  private cosineSimilarity(
    vecA: Record<string, number>,
    vecB: Record<string, number>,
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

    allKeys.forEach((key) => {
      const valA = vecA[key] || 0;
      const valB = vecB[key] || 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    });

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
