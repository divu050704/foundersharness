import { Module } from '@nestjs/common';
import { SocialMediaController } from './social.controller';
import { SocialMediaService } from './social.service';
import { DeviceHookService } from './device-hook.service';
import { BrowserPipelineService } from './browser-pipeline.service';
import { GeminiModule } from '../onboarding/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [SocialMediaController],
  providers: [SocialMediaService, DeviceHookService, BrowserPipelineService],
  exports: [SocialMediaService, DeviceHookService, BrowserPipelineService],
})
export class SocialMediaModule {}
