import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema()
export class Company {
  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  product?: string;

  @Prop({ required: false })
  stage?: string;

  @Prop({ required: false })
  teamSize?: number;

  @Prop({ type: [String], default: [] })
  goals?: string[];

  @Prop({ type: [String], default: [] })
  bottlenecks?: string[];

  @Prop({ type: [String], default: [] })
  tools?: string[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);

@Schema()
export class EntityData {
  @Prop({ required: false })
  key?: string;

  @Prop({ required: false })
  value?: string;
}

export const EntityDataSchema = SchemaFactory.createForClass(EntityData);

@Schema()
export class Entity {
  @Prop({ required: false })
  type?: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  confidence?: number;

  @Prop({ required: false })
  source?: string;

  @Prop({ type: [EntityDataSchema], default: [] })
  data?: EntityData[];
}

export const EntitySchema = SchemaFactory.createForClass(Entity);

@Schema()
export class Response{
  @Prop({required: true})
  question!: string;
  @Prop({required: true, type: mongoose.Schema.Types.Mixed})
  answer!: string | string[]
}

export const ResponseSchema = SchemaFactory.createForClass(Response)

@Schema()
export class TimelineEvent {
  @Prop({ required: false })
  date?: string;

  @Prop({ required: false })
  title?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  confidence?: number;
}

export const TimelineEventSchema = SchemaFactory.createForClass(TimelineEvent);

@Schema({ timestamps: true, strict: false })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ type: CompanySchema, default: {} })
  company!: Company;

  @Prop({ type: [EntitySchema], default: [] })
  entities!: Entity[];

  @Prop({ type: [EntitySchema], default: [] })
  entitities!: Entity[]; // alias for backwards compatibility

  @Prop({ type: [TimelineEventSchema], default: [] })
  timeline!: TimelineEvent[];

  @Prop({type: [ResponseSchema], default:[]})
  questionnaire!: Response[];
}

export const UserSchema = SchemaFactory.createForClass(User);