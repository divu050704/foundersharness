import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User,UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsService } from '../agents/agents.service';
import { EmailThread, EmailSchema } from '../agents/schemas/email.schema';
import { HindsightService } from '../memory/hindsight.service';
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, {name: EmailThread.name, schema: EmailSchema}])],
  controllers: [UserController],
  providers: [UserService, AgentsService, HindsightService]
})
export class UserModule {}
