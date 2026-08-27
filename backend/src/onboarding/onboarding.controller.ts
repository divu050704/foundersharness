import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import type { LeanCanvasOutput } from '../agents/schema';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { EntityExtractorOutput } from '../agents/schema';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOnboardingDto: CreateOnboardingDto[], @Session() session: UserSession) {
    return this.onboardingService.create(createOnboardingDto, session.user.email);
  }

  @Post("extract")
  @HttpCode(HttpStatus.CREATED)
  async extract(@Body() canvas: LeanCanvasOutput, @Session() session: UserSession) {
    const extractedFeatures  = await this.onboardingService.saveMemory(canvas, session.user.email)

    await this.onboardingService.generateEmails(extractedFeatures, session.user.email)

  }

}
