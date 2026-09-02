export class EmailAgentDTO{
    receiver!: string;
    content!: string;
    attachments!: string[];
    subject!: string;
    threadId!: string;
}