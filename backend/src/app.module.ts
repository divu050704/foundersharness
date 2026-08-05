import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [OnboardingModule, AgentsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
