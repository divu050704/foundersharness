import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SophiaChenService } from './employees/SophiaChen.service';
import { VictorStoneService } from './employees/VictorStone.service';
import { LucasBennettService } from './employees/LucasBennett.service';
import { SamuelCrossService } from './employees/SamuelCross.service';
import { RomanColeService } from './employees/RomanCole.service';
import { AriaMorganService } from './employees/AriaMorgan.service';
import { TylerReedService } from './employees/TylerReed.service';
import { AgentsService } from './agents.service';

@Processor('agent-tasks')
export class AgentTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentTaskProcessor.name);

  constructor(
    private readonly sophiaelaMiller: SophiaChenService,
    private readonly derrickVance: VictorStoneService,
    private readonly lucasmyHarper: LucasBennettService,
    private readonly stanHayes: SamuelCrossService,
    private readonly roryHoward: RomanColeService,
    private readonly angelicaMartin: AriaMorganService,
    private readonly tobiasHenderson: TylerReedService,
    private readonly agentsService: AgentsService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing BullMQ agent job '${job.name}' (ID: ${job.id})`);
    const { email, sender, previousContext, currentThreadId } = job.data;

    let replyContent: any = null;

    try {
      if (job.name === 'process-sophia-chen') {
        replyContent = await this.sophiaelaMiller.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-victor-stone') {
        replyContent = await this.derrickVance.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-lucas-bennett') {
        replyContent = await this.lucasmyHarper.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-samuel-cross') {
        replyContent = await this.stanHayes.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-roman-cole') {
        replyContent = await this.roryHoward.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-aria-morgan') {
        replyContent = await this.angelicaMartin.runModel(email, sender, previousContext, currentThreadId);
      } else if (job.name === 'process-tyler-reed') {
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
