import { Controller, Get, Redirect, Post, Body } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service';
import { HindsightService } from '../memory/hindsight.service';


@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly hindsightService: HindsightService
    ) { }
    @Get()
    @Redirect()
    async handleUserStatus(@Session() session: UserSession) {
        const email = session?.user?.email;
        const exists = email ? await this.userService.checkUserStatus(email) : false;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        if (!exists) {
            return { url: `${frontendUrl}/onboarding`, statusCode: 302 };
        }
        return { url: `${frontendUrl}/dashboard`, statusCode: 302 };
    }

    @Get("status")
    async checkStatus(@Session() session: UserSession) {
        const email = session?.user?.email;
        const exists = email ? await this.userService.checkUserStatus(email) : false;
        return { exists, email: email || null };
    }

    @Get("memory")
    async getMemoryGraph(@Session() session: UserSession) {
        const email = session?.user?.email || "";
        const graph = await this.hindsightService.getEntityGraph(email)
        return { graph: graph };
    }
}
