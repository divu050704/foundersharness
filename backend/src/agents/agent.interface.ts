import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  generatePrompt(answers: any): string;
}
