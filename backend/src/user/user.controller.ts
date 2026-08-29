import { Controller, Get, Redirect, Post, Body } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service';
import { Neo4jStore } from '../memory/neo4j.store';


@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly neo4jStore: Neo4jStore
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
        const graph = await this.neo4jStore.getGraph(email);
        return { graph: graph };
    }
}
