import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserResponse } from './interceptors/user.interceptor';
import { User } from '@prisma/client';
import { CurrentUser } from '@common/decorators';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    async create(@Body() dto) {
        const user = await this.userService.save(dto);
        return new UserResponse(user);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get(':srchIdx')
    async findOne(@Param('srchIdx') srchIdx: string) {
        const user = await this.userService.findOne(srchIdx);
        return new UserResponse(user);
    }

    @Delete(':id')
    delete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
        return this.userService.delete(id, user);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Put()
    async updateUser(@Body() body: Partial<User>) {
        const user = await this.userService.save(body);
        return new UserResponse(user);
    }
}
