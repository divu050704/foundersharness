import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  email!: string;

  @Prop({ type: [String], required: true })
  problem!: string[];

  @Prop({ type: [String], required: true })
  solution!: string[];

  @Prop({ type: [String], required: true })
  keyMetrics!: string[];

  @Prop({ type: String, required: true })
  uniqueValuePropositon!: string;

  @Prop({ type: String, required: true })
  unfairAdvantage!: string;

  @Prop({ type: [String], required: true })
  channels!: string[];

  @Prop({ type: [String], required: true })
  customerSegments!: string[];

  @Prop({ type: [String], required: true })
  costStructure!: string[];

  @Prop({ type: [String], required: true })
  revenueStrams!: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);