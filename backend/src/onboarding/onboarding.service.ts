import { Injectable, Logger } from '@nestjs/common';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { AgentsService } from '../agents/agents.service';
import { MemoryService } from '../memory/memory.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly agentsService: AgentsService,
  ) { }

  async create(createOnboardingDto: CreateOnboardingDto) {
    let canvas: any = null;
    canvas = await this.agentsService.createCanvas(createOnboardingDto)
    console.log(canvas)
    return {
      success: true,
      canvas,
    };
  }

}
