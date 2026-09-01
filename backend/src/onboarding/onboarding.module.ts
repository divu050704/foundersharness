import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { AgentsModule } from '../agents/agents.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { HindsightService } from '../memory/hindsight.service';

@Module({
  imports: [AgentsModule, MongooseModule.forFeature([{name: User.name, schema: UserSchema}])],
  controllers: [OnboardingController],
  providers: [OnboardingService, HindsightService],
})
export class OnboardingModule {}
