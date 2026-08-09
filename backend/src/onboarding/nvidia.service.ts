import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NvidiaService {
  private readonly logger = new Logger(NvidiaService.name);
  private apiKey: string | null = null;
  private readonly apiUrl =
    'https://integrate.api.nvidia.com/v1/chat/completions';
  private readonly modelName =
    'nvidia/llama-3.1-nemotron-70b-instructnvidia/llama-3.1-nemotron-nano-8b-v1';

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    // If the API key is already set via environment, use it
    if (process.env.NVIDIA_API_KEY) {
      this.apiKey = process.env.NVIDIA_API_KEY;
      return;
    }

    // Otherwise, attempt manual load from .env in backend directory
    try {
      const cwdPath = path.resolve(process.cwd(), '.env');
      const backendCwdPath = path.resolve(process.cwd(), 'backend/.env');
      const dirnamePath = path.resolve(__dirname, '../../../.env');

      let envPath = '';
      if (fs.existsSync(cwdPath)) {
        envPath = cwdPath;
      } else if (fs.existsSync(backendCwdPath)) {
        envPath = backendCwdPath;
      } else if (fs.existsSync(dirnamePath)) {
        envPath = dirnamePath;
      }

      if (envPath && fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        for (const line of envConfig.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let val = match[2] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1);
            }
            if (key === 'NVIDIA_API_KEY') {
              this.apiKey = val.trim();
              process.env.NVIDIA_API_KEY = this.apiKey;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn('Failed to load NVIDIA_API_KEY from local .env file', e);
    }
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.apiKey) {
      this.loadEnv(); // Retry loading in case key was updated
    }

    if (!this.apiKey) {
      this.logger.error('NVIDIA_API_KEY is not configured.');
      throw new Error(
        'NVIDIA_API_KEY is missing. Please add it to your backend .env file.',
      );
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 1024,
          top_p: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(
          `NVIDIA API request failed: Status ${response.status} - ${errText}`,
        );
        throw new Error(
          `NVIDIA API response error: ${response.statusText} (${response.status})`,
        );
      }

      const data = await response.json();
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content || '';
      }

      throw new Error(
        'Malformed completion response structure from NVIDIA API.',
      );
    } catch (error) {
      this.logger.error('Error contacting NVIDIA Inference API', error);
      throw error;
    }
  }
}
