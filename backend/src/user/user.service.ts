import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from './schemas/user.schema';
import { UpdateCanvasDTO } from './dto/update-canvas.dto';
import { AgentsService } from '../agents/agents.service';
import { LeanCanvasOutput } from '../agents/schema';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>, private readonly agentsService: AgentsService) {}
    // constructor(){}

    async checkUserStatus(email: string): Promise<boolean> {
        const exists=  await this.userModel.exists({ email: email });
        return exists!==null ? true : false;
    }
    async saveCanvas(email: string, canvasDTO: UpdateCanvasDTO): Promise<void>{
        await this.userModel.updateOne({email: email}, {$set: {email, canvasDTO}}, {upsert: true})
        // return true
    }
    async saveMemoery(email: string, canvas: LeanCanvasOutput): Promise<void>{
        console.log(this.agentsService.createMemory(canvas))
    }
}
