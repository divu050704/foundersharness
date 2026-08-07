import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ObjectStorage {
  private readonly logger = new Logger(ObjectStorage.name);
  private readonly storageDir = path.resolve(process.cwd(), 'data', 'storage');

  constructor() {
    this.ensureStorageDirExists();
  }

  private ensureStorageDirExists() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async storeFile(fileName: string, content: Buffer | string): Promise<{ fileId: string; filePath: string }> {
    this.ensureStorageDirExists();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${Date.now()}_${sanitizedName}`;
    const filePath = path.join(this.storageDir, uniqueName);

    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(filePath, content);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    this.logger.log(`Stored file in object storage: ${uniqueName}`);
    return {
      fileId: uniqueName,
      filePath,
    };
  }

  async getFile(fileId: string): Promise<{ content: string | Buffer; fileName: string } | null> {
    const filePath = path.join(this.storageDir, fileId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath);
    return {
      content,
      fileName: fileId.substring(fileId.indexOf('_') + 1),
    };
  }
}
