import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PamelaMillerService } from './employees/PamelaMiller.service';
import { DerrickVanceService } from './employees/DerrickVance.service';
import { JimmyHarperService } from './employees/JimmyHarper.service';
import { StanHayesService } from './employees/StanHayes.service';
import { RoryHowardService } from './employees/RoryHoward.service';
import { AngelicaMartinService } from './employees/AngelicaMartin.service';
import { TobiasHendersonService } from './employees/TobiasHenderson.service';
import { AgentsService } from './agents.service';

@Processor('agent-tasks')
export class AgentTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentTaskProcessor.name);

  constructor(
    private readonly pamelaMiller: PamelaMillerService,
    private readonly derrickVance: DerrickVanceService,
    private readonly jimmyHarper: JimmyHarperService,
    private readonly stanHayes: StanHayesService,
    private readonly roryHoward: RoryHowardService,
    private readonly angelicaMartin: AngelicaMartinService,
    private readonly tobiasHenderson: TobiasHendersonService,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing BullMQ agent job '${job.name}' (ID: ${job.id})`);
    const { email, sender, previousContext, currentThreadId } = job.data;

    let replyContent: any = null;

    try {
      if (job.name === 'process-pamela-miller') {
        replyContent = await this.pamelaMiller.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-derrick-vance') {
        replyContent = await this.derrickVance.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-jimmy-harper') {
        replyContent = await this.jimmyHarper.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-stan-hayes') {
        replyContent = await this.stanHayes.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-rory-howard') {
        replyContent = await this.roryHoward.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-angelica-martin') {
        replyContent = await this.angelicaMartin.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-tobias-henderson') {
        replyContent = await this.tobiasHenderson.runModel(email, sender, previousContext, currentThreadId);
      }

      if (replyContent) {
        // Save the agent's generated reply email to the MongoDB thread
        await this.agentsService.saveEmail(
          {
            content: typeof replyContent === 'string' ? replyContent : JSON.stringify(replyContent),
            receiver: sender,
            subject: `Re: ${email.subject || 'Conversation'}`,
            threadId: currentThreadId,
          },
          email.receiver,
        );

        this.logger.log(`Successfully completed BullMQ job '${job.name}' for thread ${currentThreadId}`);
        return { success: true, reply: replyContent };
      }
    } catch (err: any) {
      this.logger.error(`Error executing BullMQ job '${job.name}' (ID: ${job.id}): ${err.message}`, err.stack);
      throw err;
    }
  }
}
