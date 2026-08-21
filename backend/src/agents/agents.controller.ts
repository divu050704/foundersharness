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

}
