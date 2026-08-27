import { Injectable, Logger } from '@nestjs/common';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { AgentsService } from '../agents/agents.service';
import { Entity, User } from '../user/schemas/user.schema';
import type { LeanCanvasOutput } from '../agents/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Neo4jStore } from '../memory/neo4j.store';
import { EntityExtractorOutput } from '../agents/schema';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly agentsService: AgentsService,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly neo4j: Neo4jStore
  ) { }

  async create(createOnboardingDto: CreateOnboardingDto[], email: string) {
    let canvas: any = null;
    canvas = await this.agentsService.createCanvas(createOnboardingDto);
    await this.userModel.updateOne({ email: email }, { questionnaire: createOnboardingDto }, { upsert: true })
    return {
      success: true,
      canvas,
    };
  }

  async saveMemory(Canvas: LeanCanvasOutput, email: string) {

    this.logger.log(`Extracting features from LeanCanvas for email: ${email}`);
    const userDetails = (await this.userModel.findOne({ email: email }))
    const extractedFeatures = await this.agentsService.extractFeatures(Canvas, userDetails);
    const databaseData = extractedFeatures.postgres;
    const neo4jData = extractedFeatures.neo4j;
    const timeline = extractedFeatures.timeline;

    await this.userModel.updateOne(
      { email: email },
      {
        email: email,
        company: databaseData.company,
        timeline: timeline,
        entities: databaseData.entities,
      },
      { upsert: true }
    );

    await this.neo4j.saveGraph(email, neo4jData);
    this.logger.log(`Successfully stored memory extraction for email: ${email}`);
    return extractedFeatures;

  }

  async generateEmails(extractedFeatures: EntityExtractorOutput, email: string) {
    
  }

}
