import { ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const JwtAsyncCofig = (): JwtModuleAsyncOptions => ({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
            expiresIn: config.get<string>('JWT_EXP', '5m'),
        },
    }),
});
