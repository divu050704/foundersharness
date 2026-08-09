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
    private readonly memoryService: MemoryService,
  ) {}

  async create(createOnboardingDto: CreateOnboardingDto) {
    let canvas: any = null;

    try {
      const aiResponse = await this.agentsService.executeAgent(
        'lean-canvas',
        createOnboardingDto,
      );

      let cleanJson = aiResponse.trim();
      console.log(cleanJson);
      // Robust JSON extraction to strip preamble/conversational text surrounding the JSON block
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson
          .replace(/^```(json)?\n/, '')
          .replace(/\n```$/, '')
          .trim();
      }

      canvas = JSON.parse(cleanJson);
      this.logger.log('Successfully generated AI Lean Canvas');
    } catch (error) {
      this.logger.warn(
        'Failed to generate AI Lean Canvas, using fallback',
        error,
      );
    }

    // Connect to Memory Extraction Pipeline
    try {
      const onboardingText = `
=== FOUNDER ONBOARDING PROFILE ===

What they are building:
${createOnboardingDto[1] || 'Not specified'}

Ideal Customer Segment (ICP):
${createOnboardingDto[2] || 'Not specified'}

Startup Stage:
${createOnboardingDto[3] || 'Not specified'}

Top 90-Day Priorities:
- ${createOnboardingDto[4] || 'Not specified'}

Key Bottlenecks/Slowing Down:
- ${createOnboardingDto[5] || 'Not specified'}

Team Setup:
${createOnboardingDto[6] || 'Not specified'}

Daily Tools:
${Array.isArray(createOnboardingDto[7]) ? createOnboardingDto[7].join(', ') : createOnboardingDto[7] || 'None'}

Repetitive Tasks to Automate:
- ${createOnboardingDto[8] || 'Not specified'}

Success In 6 Months:
- ${createOnboardingDto[9] || 'Not specified'}

AI Focus Areas:
${Array.isArray(createOnboardingDto[10]) ? createOnboardingDto[10].join(', ') : createOnboardingDto[10] || 'None'}

Additional Context:
${createOnboardingDto[11] || 'None'}

=== GENERATED LEAN CANVAS STRATEGY ===
- Problems: ${canvas?.problem ? canvas.problem.join(' | ') : 'None'}
- Solutions: ${canvas?.solution ? canvas.solution.join(' | ') : 'None'}
- UVP: ${canvas?.uvp ? canvas.uvp.join(' | ') : 'None'}
- Unfair Advantage: ${canvas?.unfairAdvantage ? canvas.unfairAdvantage.join(' | ') : 'None'}
- Customer Segments: ${canvas?.customerSegments ? canvas.customerSegments.join(' | ') : 'None'}
- Key Metrics: ${canvas?.keyMetrics ? canvas.keyMetrics.join(' | ') : 'None'}
- Channels: ${canvas?.channels ? canvas.channels.join(' | ') : 'None'}
- Cost Structure: ${canvas?.costStructure ? canvas.costStructure.join(' | ') : 'None'}
- Revenue Streams: ${canvas?.revenueStreams ? canvas.revenueStreams.join(' | ') : 'None'}
`;

      this.logger.log(
        'Triggering Memory Extraction Pipeline for Onboarding data...',
      );
      await this.memoryService.ingestDocument(
        'Founder Onboarding Profile',
        onboardingText.trim(),
        'onboarding',
        { stage: createOnboardingDto[3] },
      );
      this.logger.log(
        'Memory Extraction Pipeline completed for Onboarding data',
      );
    } catch (e) {
      this.logger.error(
        'Failed to run Memory Extraction Pipeline on onboarding data',
        e,
      );
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
