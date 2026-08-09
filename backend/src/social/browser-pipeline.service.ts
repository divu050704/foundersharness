import { Injectable, Logger } from '@nestjs/common';
import { DeviceHookService } from './device-hook.service';
import { GeminiService, PipelineStage, AgentFinishVerdict, FieldRequirement } from '../onboarding/gemini.service';

export interface RunBrowserPipelineOptions {
  label: string;
  systemPrompt: string;
  stages: PipelineStage[];
  startUrl?: string;
  maxAttempts?: number;
  handleFinish?: (action: any, attempt: number, maxAttempts: number) => Promise<AgentFinishVerdict>;
  navigateTimeoutMs?: number;
  clickTimeoutMs?: number;
  finishRequirements?: FieldRequirement[];
}

@Injectable()
export class BrowserPipelineService {
  private readonly logger = new Logger(BrowserPipelineService.name);

  constructor(
    private readonly deviceHookService: DeviceHookService,
    private readonly geminiService: GeminiService,
  ) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getBrowserState(): Promise<{ url: string; elements: string }> {
    try {
      const url = await this.deviceHookService.sendCommand('evaluate', {
        script: 'window.location.href',
      });
      const rawElements = await this.deviceHookService.sendCommand('content');
      return { url: url || '', elements: rawElements };
    } catch (err) {
      this.logger.error('Failed to get browser state:', err.message);
      return { url: '', elements: '' };
    }
  }

  async executeBrowserAction(
    action: any,
    opts: { navigateTimeoutMs?: number; clickTimeoutMs?: number } = {},
  ) {
    const { navigateTimeoutMs = 15000, clickTimeoutMs = 35000 } = opts;

    if (action.action === 'navigate') {
      if (!action.url) throw new Error('"url" is required for navigate action.');
      let targetUrl = action.url;
      if (targetUrl.startsWith('/')) {
        try {
          const currentUrl = await this.deviceHookService.sendCommand('evaluate', {
            script: 'window.location.href',
          });
          if (currentUrl) {
            const urlObj = new URL(currentUrl);
            targetUrl = urlObj.origin + targetUrl;
          }
        } catch (err) {
          this.logger.warn(`Failed to resolve relative URL: ${err.message}`);
        }
      }
      await this.deviceHookService.sendCommand('navigate', { url: targetUrl }, navigateTimeoutMs);
      await this.sleep(4000);
      return { feedback: `Successfully navigated to: ${targetUrl}` };
    }
    if (action.action === 'click') {
      if (!action.selector) throw new Error('"selector" is required for click action.');
      await this.deviceHookService.sendCommand('click', { selector: action.selector }, clickTimeoutMs);
      await this.sleep(2000);
      return { feedback: `Successfully clicked selector: "${action.selector}"` };
    }
    if (action.action === 'fill') {
      if (!action.selector || action.text === undefined) {
        throw new Error('Both "selector" and "text" are required for fill action.');
      }
      await this.deviceHookService.sendCommand('fill', { selector: action.selector, text: action.text }, 10000);
      await this.sleep(2000);
      return { feedback: `Successfully filled selector: "${action.selector}"` };
    }
    if (action.action === 'wait') {
      const waitMs = action.ms || 2000;
      await this.sleep(waitMs);
      return { feedback: `Successfully waited for ${waitMs}ms.` };
    }

    throw new Error(`Unknown action type "${action.action}".`);
  }

  async run(opts: RunBrowserPipelineOptions): Promise<any> {
    if (!this.deviceHookService.isHookConnected()) {
      throw new Error('device-hook desktop helper is not connected. Please open it.');
    }

    if (opts.startUrl) {
      await this.deviceHookService.sendCommand('navigate', { url: opts.startUrl });
      await this.sleep(3000);
    }

    return this.geminiService.runAgentLoop({
      label: opts.label,
      systemPrompt: opts.systemPrompt,
      pipelineStages: opts.stages,
      maxAttempts: opts.maxAttempts ?? 15,
      getState: () => this.getBrowserState(),
      buildUserPrompt: () => '',
      executeAction: (action) =>
        this.executeBrowserAction(action, {
          navigateTimeoutMs: opts.navigateTimeoutMs ?? 15000,
          clickTimeoutMs: opts.clickTimeoutMs ?? 35000,
        }),
      handleFinish: opts.handleFinish,
      finishRequirements: opts.finishRequirements,
    });
  }
}
