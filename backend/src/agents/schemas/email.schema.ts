import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";


@Schema({timestamps: true})
export class Email{
    @Prop()
    sender?: string;
    @Prop()
    receiver?: string;
    @Prop()
    content?: string;
    @Prop()
    attachments?: [string];
    @Prop()
    read?: boolean;
}

export const EmailSchema = SchemaFactory.createForClass(Email)

@Schema({timestamps: true})
export class EmailThread{
    @Prop()
    subject?: string;
    @Prop({type: [EmailSchema], default: []})
    emails?: Email[];
    @Prop()
    agent?: string;
}

export const EmailThreadSchema = SchemaFactory.createForClass(EmailThread)