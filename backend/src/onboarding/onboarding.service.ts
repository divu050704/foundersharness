import { Injectable, Logger } from '@nestjs/common';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly agentsService: AgentsService) {}

  async create(createOnboardingDto: CreateOnboardingDto) {   

    let canvas: any = null;

    try {
      const aiResponse = await this.agentsService.executeAgent('lean-canvas', createOnboardingDto);
      
      let cleanJson = aiResponse.trim();
      console.log(cleanJson)
      // Robust JSON extraction to strip preamble/conversational text surrounding the JSON block
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?\n/, '').replace(/\n```$/, '').trim();
      }

      canvas = JSON.parse(cleanJson);
      this.logger.log('Successfully generated AI Lean Canvas');
    } catch (error) {
      this.logger.warn('Failed to generate AI Lean Canvas, using fallback', error);
    }


    return {
      success: true,
      canvas,
    };
  }

  findAll() {
    return `This action returns all onboarding`;
  }

  findOne(id: number) {
    return `This action returns a #${id} onboarding`;
  }

  update(id: number, updateOnboardingDto: UpdateOnboardingDto) {
    return `This action updates a #${id} onboarding`;
  }

  remove(id: number) {
    return `This action removes a #${id} onboarding`;
  }
}

