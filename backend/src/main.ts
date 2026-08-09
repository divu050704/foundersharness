import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

// Load local .env variables into process.env before initialization
function bootstrapEnv() {
  try {
    const cwdPath = path.resolve(process.cwd(), '.env');
    const backendCwdPath = path.resolve(process.cwd(), 'backend/.env');
    const dirnamePath = path.resolve(__dirname, '../../.env');

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
        const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)?$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
          if (val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          }
          val = val.trim();
          // Set if not already defined externally
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load local .env variables', e);
  }
}

bootstrapEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
