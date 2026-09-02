// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth'; // your betterAuth(...) instance

import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { MemoryModule } from './memory/memory.module';

import { BullModule } from '@nestjs/bullmq';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ||
          config.get<string>('MONGO_URI') ||
          config.get<string>('DATABASE_URL'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
        },
      }),
    }),
    MemoryModule,
    OnboardingModule,
    AgentsModule,
    AuthModule.forRoot(auth), // ← pass your auth instance here
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}