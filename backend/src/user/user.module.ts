import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User,UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsService } from '../agents/agents.service';
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService, AgentsService]
})
export class UserModule {}
