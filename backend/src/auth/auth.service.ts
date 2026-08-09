import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClientId: string | null = null;

  constructor() {
    this.loadEnv();
  }

  private loadEnv() {
    if (process.env.GOOGLE_CLIENT_ID) {
      this.googleClientId = process.env.GOOGLE_CLIENT_ID;
      return;
    }

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
            if (key === 'GOOGLE_CLIENT_ID') {
              this.googleClientId = val.trim();
              process.env.GOOGLE_CLIENT_ID = this.googleClientId;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn(
        'Failed to load GOOGLE_CLIENT_ID from local .env file',
        e,
      );
    }
  }

  async verifyGoogleToken(token: string): Promise<any> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      // Direct call to Google TokenInfo API to verify the signature and expiry
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
      const response = await fetch(verifyUrl);

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Google token validation failed: ${errText}`);
        throw new UnauthorizedException(
          'Invalid Google token signature or expired',
        );
      }

      const payload = await response.json();

      // Verify the audience (client ID) if configured in our environment
      if (this.googleClientId && payload.aud !== this.googleClientId) {
        this.logger.error(
          `Google token audience mismatch: Token aud=${payload.aud}, Expected clientID=${this.googleClientId}`,
        );
        throw new UnauthorizedException('Token audience mismatch');
      }

      const email = payload.email;
      const name = payload.name || 'Google User';
      const picture = payload.picture || '';

      // Determine onboarding status. In a real DB, we would check the database record.
      // For this implementation, we check if they are "Sarah Connor" or have been onboarded in this session.
      // (Sarah Connor is our simulated existing user).
      const isSarah = email === 's.connor@cyberdyne.co';

      return {
        success: true,
        user: {
          email,
          name,
          avatar: name
            .split(' ')
            .map((n: string) => n[0])
            .join(''),
          picture,
        },
        onboarded: isSarah,
      };
    } catch (error) {
      this.logger.error('Error verifying Google Token', error);
      throw new UnauthorizedException('Google Token verification failed');
    }
  }
}
