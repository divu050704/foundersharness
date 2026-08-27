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
        const email = session.user.email;
        const exists = await this.userService.checkUserStatus(email);
        if (!exists) {
            return { url: `${process.env.FRONTEND_URL}/onboarding`, statusCode: 302 }
        }
        return { url: `${process.env.FRONTEND_URL}/dashboard`, statusCode: 302 }

    }

    @Get("memory")
    async getMemoryGraph(@Session() session: UserSession) {
        const graph = await this.neo4jStore.getGraph(session.user.email);
        return {graph: graph}
    }
}
