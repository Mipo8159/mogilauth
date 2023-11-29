import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from '@auth/guards/jwt.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        UserModule,
        PrismaModule,
        AuthModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtGuard,
        },
    ],
})
export class AppModule {}
