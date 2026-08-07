import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { SocialMediaService } from './social.service';
import { DeviceHookService } from './device-hook.service';

@Controller('social')
export class SocialMediaController {
  constructor(
    private readonly socialMediaService: SocialMediaService,
    private readonly deviceHookService: DeviceHookService,
  ) {}

  /**
   * Endpoint to check connection to device-hook desktop helper itself
   */
  @Get('hook-status')
  getHookStatus() {
    return {
      connected: this.deviceHookService.isHookConnected(),
      message: this.deviceHookService.isHookConnected()
        ? 'Connected to device-hook C# helper.'
        : 'device-hook helper is not running or connected.',
    };
  }

  /**
   * Endpoint to check session status for LinkedIn and Instagram
   */
  @Get('session-status')
  async getSessionStatus(@Query('platform') platform: 'linkedin' | 'instagram'): Promise<any> {
    if (!platform) {
      throw new BadRequestException('Platform parameter is required (linkedin or instagram).');
    }
    if (platform !== 'linkedin' && platform !== 'instagram') {
      throw new BadRequestException('Invalid platform. Supported platforms: linkedin, instagram.');
    }

    try {
      const result = await this.socialMediaService.verifySession(platform);
      return result;
    } catch (err) {
      return {
        connected: false,
        error: err.message,
      };
    }
  }

  /**
   * Endpoint to post content to social media accounts
   */
  @Post('post')
  async postContent(
    @Body('platform') platform: 'linkedin' | 'instagram',
    @Body('content') content: string,
  ): Promise<any> {
    if (!platform || !content) {
      throw new BadRequestException('Both platform and content are required.');
    }
    if (platform !== 'linkedin' && platform !== 'instagram') {
      throw new BadRequestException('Invalid platform. Supported platforms: linkedin, instagram.');
    }

    try {
      const result = await this.socialMediaService.postContent(platform, content);
      return result;
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  /**
   * Endpoint to retrieve the current social media calendar
   */
  @Get('calendar')
  async getCalendar(): Promise<any[]> {
    return this.socialMediaService.getCalendar();
  }

  /**
   * Endpoint to trigger generation of 7-day calendar
   */
  @Post('generate-calendar')
  async generateCalendar(@Body('platform') platform: 'linkedin' | 'instagram'): Promise<any> {
    if (!platform || (platform !== 'linkedin' && platform !== 'instagram')) {
      throw new BadRequestException('Valid platform (linkedin or instagram) is required.');
    }
    
    try {
      const calendar = await this.socialMediaService.generateCalendar(platform);
      return {
        success: true,
        calendar,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  /**
   * Endpoint to save custom calendar modifications
   */
  @Post('save-calendar')
  async saveCalendar(@Body('calendar') calendar: any[]): Promise<any> {
    if (!calendar || !Array.isArray(calendar)) {
      throw new BadRequestException('Valid calendar array is required.');
    }

    try {
      await this.socialMediaService.saveCalendar(calendar);
      return {
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  /**
   * Endpoint to manually launch browser session
   */
  @Post('launch-browser')
  async launchBrowser(@Body('sessionName') sessionName: string): Promise<any> {
    return this.socialMediaService.launchBrowser(sessionName || 'default');
  }

  /**
   * Endpoint to manually close active browser
   */
  @Post('close-browser')
  async closeBrowser(): Promise<any> {
    return this.socialMediaService.closeBrowser();
  }

  /**
   * Endpoint to query the helper's active session profile name
   */
  @Get('active-session')
  async getActiveSession(): Promise<any> {
    return this.socialMediaService.getActiveSession();
  }

  /**
   * Endpoint to query all saved custom browser session names
   */
  @Get('browser-sessions')
  async getBrowserSessions(): Promise<string[]> {
    return this.socialMediaService.getBrowserSessions();
  }
}
