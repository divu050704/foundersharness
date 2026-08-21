import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../onboarding/gemini.service';
import { MongoDbStore } from './mongodb.store';
import { Neo4jStore } from './neo4j.store';
import { TimelineStore } from './timeline.store';
import { ObjectStorage } from './object.storage';

@Injectable()
export class MemoryExtractionPipeline {
  private readonly logger = new Logger(MemoryExtractionPipeline.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly mongodbStore: MongoDbStore,
    private readonly neo4jStore: Neo4jStore,
    private readonly timelineStore: TimelineStore,
    private readonly objectStorage: ObjectStorage,
  ) {}

  /**
   * Processes a document (transcript, onboarding, etc.), extracts facts,
   * updates the memory systems, and stores the original file.
   */
  async ingestDocument(
    title: string,
    content: string,
    category: 'onboarding' | 'meeting' | 'pitch' | 'note',
    metadata: Record<string, any> = {},
  ): Promise<any> {
    this.logger.log(
      `Ingesting document into Memory Extraction Pipeline: "${title}" (${category})`,
    );

    // 1. Store original file in Object Storage
    const { fileId } = await this.objectStorage.storeFile(
      `${category}_${title}.txt`,
      content,
    );
    metadata.fileId = fileId;

    // 3. Extract structured memory via LLM
    try {
      const systemPrompt = `You are a high-fidelity Memory Extraction Pipeline for a Founder's OS. 
Analyze the input text (onboarding details, transcripts, notes, etc.) and extract structured facts, entities, relationships, and chronological events.

Your response MUST be a single, valid JSON object containing exactly these fields:
{
  "postgres": {
    "company": {
      "name": "string (inferred name of company or 'My Company' if unknown)",
      "product": "string (summary of what is being built)",
      "stage": "string (e.g., Idea, MVP, Pre-revenue, Growth)",
      "teamSize": number (total team members, inferred or default 1),
      "goals": ["string"],
      "bottlenecks": ["string"],
      "tools": ["string"]
    },
    "entities": [
      {
        "type": "string (e.g., Customer, Competitor, Feature, Partner, Founder, Advisor, Investor)",
        "name": "string (name of entity)",
        "data": { "key": "value" },
        "confidence": number (0.0 to 1.0 confidence score of extraction),
        "source": "string (source context or document title)"
      }
    ]
  },
  "neo4j": {
    "nodes": [
      { "id": "string (unique identifier, e.g., name or title)", "label": "string (e.g., Person, Tool, Feature, Customer, Company)", "properties": { "key": "value" } }
    ],
    "edges": [
      { "source": "string (node id)", "target": "string (node id)", "type": "string (VERB_IN_CAPS, e.g., CREATED, USES, TARGETS, DELAYED, RECRUITED)", "properties": { "key": "value" } }
    ]
  },
  "timeline": [
    {
      "date": "string (format YYYY-MM or YYYY-MM-DD or approximate)",
      "title": "string (short event description)",
      "description": "string (detailed event description)",
      "confidence": number (0.0 to 1.0)
    }
  ]
}

Rules:
- Be highly precise. Do not invent connections that aren't mentioned or clearly implied in the text.
- If certain sections like 'entities' or 'timeline' have no data, leave them as empty arrays [].
- Output ONLY raw valid JSON starting with { and ending with }. Do not wrap in markdown \`\`\`json or add conversational text.`;

      const userPrompt = `Context Title: "${title}"
Category: "${category}"
Content:
${content}`;

      const aiResponse = await this.geminiService.generateCompletion(
        systemPrompt,
        userPrompt,
        { type: 'json_object' },
      );

      const extracted = this.parseRobustJson(aiResponse);
      this.logger.log(
        'Successfully extracted structured facts using Gemini LLM',
      );

      // 4. Update MongoDB Atlas store
      if (extracted.postgres) {
        if (extracted.postgres.company) {
          await this.mongodbStore.updateCompany(extracted.postgres.company);
        }
        if (Array.isArray(extracted.postgres.entities)) {
          for (const entity of extracted.postgres.entities) {
            await this.mongodbStore.updateEntity(entity.type, entity.name, {
              data: entity.data,
              confidence: entity.confidence,
              source: title,
              verified: true,
            });
          }
        }
      }

      // 5. Update Neo4j simulated knowledge graph
      if (extracted.neo4j) {
        if (Array.isArray(extracted.neo4j.nodes)) {
          for (const node of extracted.neo4j.nodes) {
            await this.neo4jStore.addNode(node);
          }
        }
        if (Array.isArray(extracted.neo4j.edges)) {
          for (const edge of extracted.neo4j.edges) {
            await this.neo4jStore.addRelationship(
              edge.source,
              edge.type,
              edge.target,
              edge.properties || {},
            );
          }
        }
      }

      // 6. Update Timeline simulated store
      if (extracted.timeline && Array.isArray(extracted.timeline)) {
        for (const event of extracted.timeline) {
          await this.timelineStore.addEvent({
            date: event.date || new Date().toISOString().substring(0, 7),
            title: event.title,
            description: event.description,
            confidence: event.confidence || 1.0,
            source: title,
          });
        }
      }

      return {
        success: true,
        extracted,
      };
    } catch (error) {
      this.logger.error(
        'Failed to parse or save extracted memory structures',
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private parseRobustJson(text: string): any {
    let clean = text.trim();

    // Strip markdown code block wrappers if present
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    // Remove trailing commas before closing braces/brackets
    clean = clean.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(clean);
    } catch (e) {
      this.logger.warn(
        'Failed to parse JSON directly. Attempting diagnostic log...',
      );
      const errorPositionMatch = e.message.match(/at position (\d+)/);
      if (errorPositionMatch) {
        const pos = parseInt(errorPositionMatch[1], 10);
        const snippetStart = Math.max(0, pos - 50);
        const snippetEnd = Math.min(clean.length, pos + 50);
        this.logger.error(
          `JSON Parse error around index ${pos}: "...${clean.substring(snippetStart, snippetEnd)}..."`,
        );
      } else {
        this.logger.error(
          `JSON Parse error: ${e.message}. Raw text size: ${clean.length}`,
        );
      }
      throw e;
    }
  }
}
