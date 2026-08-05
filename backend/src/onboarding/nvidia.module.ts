import { Module } from '@nestjs/common';
import { NvidiaService } from './nvidia.service';

@Module({
  providers: [NvidiaService],
  exports: [NvidiaService],
})
export class NvidiaModule {}
