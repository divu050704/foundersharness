import { Controller, Get, Redirect, Post, Body, UnauthorizedException } from '@nestjs/common';
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
        if (!session || !session.user) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return { url: `${frontendUrl}/login`, statusCode: 302 };
        }
        const email = session.user.email;
        const exists = await this.userService.checkUserStatus(email);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        if (!exists) {
            return { url: `${frontendUrl}/onboarding`, statusCode: 302 };
        }
        return { url: `${frontendUrl}/dashboard`, statusCode: 302 };
    }

    @Get("status")
    async checkStatus(@Session() session: UserSession) {
        if (!session || !session.user) {
            throw new UnauthorizedException('User is not logged in');
        }
        const email = session.user.email;
        const exists = await this.userService.checkUserStatus(email);

        return { exists, email };
    }

    @Get("memory")
    async getMemoryGraph(@Session() session: UserSession) {
        if (!session || !session.user) {
            throw new UnauthorizedException('User is not logged in');
        }
        const email = session.user.email;
        const graph = await this.hindsightService.getEntityGraph(email);
        return { graph: graph };
    }
}
