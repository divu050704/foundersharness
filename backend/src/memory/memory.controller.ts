import { Controller, Get, Post, Body, Query, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('company')
  async getCompany() {
    return this.memoryService.getCompany();
  }

  @Get('entities')
  async getEntities(@Query('type') type?: string) {
    return this.memoryService.listEntities(type);
  }

  @Get('timeline')
  async getTimeline(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.memoryService.timeline(limitNum);
  }

  @Get('graph')
  async getGraph() {
    return this.memoryService.getGraph();
  }

  @Post('search')
  async search(@Body() body: { query: string; limit?: number }) {
    return this.memoryService.search(body.query, body.limit || 5);
  }

  @Post('context')
  async getContext(@Body() body: { query: string }) {
    const context = await this.memoryService.buildContext(body.query);
    return { context };
  }

  @Post('ingest')
  async ingest(
    @Body()
    body: {
      title: string;
      content: string;
      category: 'onboarding' | 'meeting' | 'pitch' | 'note';
      metadata?: Record<string, any>;
    },
  ) {
    return this.memoryService.ingestDocument(
      body.title,
      body.content,
      body.category,
      body.metadata || {},
    );
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset() {
    await this.memoryService.resetMemory();
    return { success: true, message: 'Simulated memory system reset successfully.' };
  }
}
