import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { GroqModule } from './groq.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [GroqModule, AgentsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}




