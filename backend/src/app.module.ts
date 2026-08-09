import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { SocialMediaModule } from './social/social.module';
import { MemoryModule } from './memory/memory.module';

@Module({
  imports: [
    OnboardingModule,
    AgentsModule,
    AuthModule,
    SocialMediaModule,
    MemoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
