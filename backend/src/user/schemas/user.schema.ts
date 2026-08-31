import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';


@Schema()
export class Response{
  @Prop({required: true})
  question!: string;
  @Prop({required: true, type: mongoose.Schema.Types.Mixed})
  answer!: string | string[]
}

export const ResponseSchema = SchemaFactory.createForClass(Response)


@Schema({ timestamps: true, strict: false })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({type: [ResponseSchema], default:[]})
  questionnaire!: Response[];

  @Prop({ required: true, default: false })
  initialMemorySaved!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);