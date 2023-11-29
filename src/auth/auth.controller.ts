import {
    BadRequestException,
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { AuthService } from './auth.service';
import { ITokens } from './interfaces';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Agent, Cookie, CurrentUser, Public, Roles } from '@common/decorators';
import { UserResponse } from '@user/interceptors/user.interceptor';
import { Provider, Role, User } from '@prisma/client';
import { RolesGuard } from './guards/role.guard';
import { GoogleGuard } from './guards/google.guard';
import { HttpService } from '@nestjs/axios';
import { map, mergeMap } from 'rxjs';
import { handleTimeoutAndErrors } from '@common/helpers';
import { YandexGuard } from './guards/yandex.guard';

export const REFRESH_TOKEN = 'refreshToken';

@Public()
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.authService.register(dto);
        if (!user) {
            throw new BadRequestException('not registered');
        }
        return new UserResponse(user);
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res() res: Response, @Req() req: Request, @Agent() agent: string) {
        const tokens = await this.authService.login(dto, agent);
        if (!tokens) {
            throw new BadRequestException('not logged in');
        }
        this.setRefreshTokenToCookies(tokens, res);
    }

    @Get('logout')
    async logout(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response) {
        if (!refreshToken) {
            res.sendStatus(HttpStatus.OK);
            return;
        }
        await this.authService.deleteRefreshToken(refreshToken);
        res.cookie(REFRESH_TOKEN, '', { httpOnly: true, secure: true, expires: new Date() });
        res.sendStatus(HttpStatus.OK);
    }

    @Get('refresh-tokens')
    async refreshTokens(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response, @Agent() agent: string) {
        if (!refreshToken) {
            throw new UnauthorizedException();
        }

        const tokens = await this.authService.refreshTokens(refreshToken, agent);
        if (!tokens) {
            throw new UnauthorizedException();
        }
        this.setRefreshTokenToCookies(tokens, res);
    }

    // SET COOKIE
    private setRefreshTokenToCookies(tokens: ITokens, res: Response) {
        if (!tokens) {
            throw new UnauthorizedException();
        }
        res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
            httpOnly: true,
            sameSite: 'lax',
            expires: new Date(tokens.refreshToken.exp),
            secure: this.configService.get('NODE_ENV', 'development') === 'production',
            path: '/',
        });
        res.status(HttpStatus.CREATED).json({ accessToken: tokens.accessToken });
    }

    // USAGE OF ROLE GUARD AND DECORATOR
    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get()
    me(@CurrentUser() user: User) {
        return user;
    }

    // GOOGLE AUTH
    @UseGuards(GoogleGuard)
    @Get('google')
    googleAuth() {} // eslint-disable-line

    // GOOGLE AUTH (CALLBACK)
    @UseGuards(GoogleGuard)
    @Get('google/callback')
    googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user['accessToken'];
        return res.redirect(`http://localhost:3000/api/auth/success-google?token=${token}`);
    }
    @Get('success-google')
    successGoogle(@Query('token') token: string, @Agent() agent: string) {
        return this.httpService.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`).pipe(
            mergeMap(({ data: { email } }) => this.authService.providerAuth(email, agent, Provider.GOOGLE)),
            handleTimeoutAndErrors(),
        );
    }

    // YANDEX AUTH
    @UseGuards(YandexGuard)
    @Get('yandex')
    YandexAuth() {} // eslint-disable-line

    // GOOGLE AUTH (CALLBACK)
    @UseGuards(YandexGuard)
    @Get('yandex/callback')
    yandexAuthCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user['accessToken'];
        return res.redirect(`http://localhost:3000/api/auth/success-yandex?token=${token}`);
    }
    @Get('success-yandex')
    successYandex(@Query('token') token: string, @Agent() agent: string, @Res() res: Response) {
        return this.httpService.get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`).pipe(
            mergeMap(({ data: { default_email } }) =>
                this.authService.providerAuth(default_email, agent, Provider.YANDEX),
            ),
            map((data) => this.setRefreshTokenToCookies(data, res)),
            handleTimeoutAndErrors(),
        );
    }
}
