import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';


@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async checkUserStatus(email: string): Promise<boolean> {
        const exists=  await this.userModel.exists({ email: email, initialMemorySaved: true });
        return exists!==null ? true : false;
    }
    
}
