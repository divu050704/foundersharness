import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
