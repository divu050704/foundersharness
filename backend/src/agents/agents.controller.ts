import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { EmailAgentDTO } from './dto/email-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}
  
  @Post("send-email")
  async sendEmail(@Session() session: UserSession, @Body() email: EmailAgentDTO){
    const senderEmail = session?.user?.email || "founder@harness.io";
    return await this.agentsService.initiateAgent(email, senderEmail);
  }

  @Get("threads")
  async getThreads() {
    return await this.agentsService.getEmailThreads();
  }
}
