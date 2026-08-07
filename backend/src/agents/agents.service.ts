import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../onboarding/gemini.service';
import { getAgentById } from './instances';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async executeAgent(agentId: string, answers: any): Promise<string> {
    const agent = getAgentById(agentId);
    if (!agent) {
      this.logger.error(`Agent not found with ID: ${agentId}`);
      throw new Error(`Agent not found: ${agentId}`);
    }

    const systemPrompt = agent.systemPrompt;
    const userPrompt = agent.generatePrompt(answers);

    this.logger.log(`Executing agent: ${agent.name} (${agent.id})`);
    return this.geminiService.generateCompletion(systemPrompt, userPrompt);
  }
}

