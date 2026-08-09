import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { GeminiModule } from './gemini.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [GeminiModule, AgentsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
