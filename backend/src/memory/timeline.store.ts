import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface TimelineEvent {
  date: string; // e.g. "2026-08" or "2026-08-06"
  title: string;
  description: string;
  confidence: number;
  source: string;
  createdAt: string;
}

@Injectable()
export class TimelineStore {
  private readonly logger = new Logger(TimelineStore.name);
  private readonly dbPath = path.resolve(
    process.cwd(),
    'data',
    'timeline.json',
  );

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
        JSON.stringify({ events: [] }, null, 2),
        'utf8',
      );
    }
  }

  private readDb(): { events: TimelineEvent[] } {
    try {
      this.ensureDbExists();
      const content = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      this.logger.error('Failed to read Timeline simulated database', e);
      return { events: [] };
    }
  }

  private writeDb(data: { events: TimelineEvent[] }) {
    try {
      this.ensureDbExists();
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Failed to write Timeline simulated database', e);
    }
  }

  async addEvent(event: Omit<TimelineEvent, 'createdAt'>): Promise<void> {
    const db = this.readDb();
    const newEvent: TimelineEvent = {
      ...event,
      createdAt: new Date().toISOString(),
    };
    db.events.push(newEvent);
    // Sort events by date descending/ascending
    db.events.sort((a, b) => b.date.localeCompare(a.date));
    this.writeDb(db);
    this.logger.log(`Timeline event added: [${event.date}] ${event.title}`);
  }

  async getTimeline(limit = 20): Promise<TimelineEvent[]> {
    const db = this.readDb();
    return db.events.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.writeDb({ events: [] });
  }
}
