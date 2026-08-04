import { PartialType } from '@nestjs/mapped-types';
import { CreateOnboardingDto } from './create-onboarding.dto';

export class UpdateOnboardingDto extends PartialType(CreateOnboardingDto) {}
