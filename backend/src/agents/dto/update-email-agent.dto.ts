import { PartialType } from '@nestjs/mapped-types';
import { EmailAgentDTO } from './create-email-agent.dto';

export class UpdateEmailAgentDTO extends PartialType(EmailAgentDTO){}