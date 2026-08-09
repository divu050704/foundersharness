import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AGENT_MAP } from './instances';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  listAgents() {
    return Object.values(AGENT_MAP).map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
    }));
  }

  @Post('run')
  async runAgent(@Body() body: { agentId: string; answers: any }) {
    const { agentId, answers } = body;
    if (!agentId || !answers) {
      throw new HttpException(
        'Missing agentId or answers in request body',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const response = await this.agentsService.executeAgent(agentId, answers);
      return {
        success: true,
        response,
      };
    } catch (e) {
      throw new HttpException(
        `Failed to execute agent: ${e.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
