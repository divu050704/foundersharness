import { Controller, Get, Redirect, Post, Body } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service';


@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}
    @Get()
    @Redirect()
    async handleUserStatus(@Session() session: UserSession){
        const email = session.user.email;
        const exists = await this.userService.checkUserStatus(email);
        if (!exists){
            return { url: `${process.env.FRONTEND_URL}/onboarding`, statusCode: 302 }
        }
        return { url: `${process.env.FRONTEND_URL}/dashboard`, statusCode: 302 }
        
    }
}
