import { PrismaService } from '@prisma/prisma.service';
import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { UserService } from '@user/user.service';
import { ITokens } from './interfaces';
import { compareSync } from 'bcrypt';
import { Provider, Token, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { v4 } from 'uuid';
import { add } from 'date-fns';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly prismaService: PrismaService,
    ) {}

    // REGISTER
    async register(dto: RegisterDto) {
        const user: User = await this.userService.findOne(dto.email).catch((err) => {
            this.logger.error(err);
            return null;
        });

        if (user) {
            throw new ConflictException('email is taken');
        }

        return this.userService.save(dto).catch((err) => {
            this.logger.error(err);
            return null;
        });
    }

    // LOGIN
    async login(dto: LoginDto, agent: string): Promise<ITokens> {
        const user: User = await this.userService.findOne(dto.email, true).catch((err) => {
            this.logger.error(err);
            return null;
        });

        if (!user || !compareSync(dto.password, user.password)) {
            throw new UnauthorizedException('incorrect credentials');
        }

        return this.generateTokens(user, agent);
    }

    // DELETE TOKEN
    deleteRefreshToken(token: string) {
        return this.prismaService.token.delete({ where: { token } });
    }

    // REFRESH TOKENS
    async refreshTokens(refreshToken: string, agent: string): Promise<ITokens> {
        const token = await this.prismaService.token.delete({ where: { token: refreshToken } });
        if (!token || new Date(token.exp) < new Date()) {
            throw new UnauthorizedException();
        }
        const user = await this.userService.findOne(token.userId);
        return this.generateTokens(user, agent);
    }

    // GENERATE TOKENS
    private async generateTokens(user: User, agent: string): Promise<ITokens> {
        const accessToken = await this.jwtService.signAsync({
            id: user.id,
            email: user.email,
            roles: user.roles,
        });
        const refreshToken = await this.refreshToken(user.id, agent);
        return { accessToken, refreshToken };
    }

    // CREATES / UPDATES TOKEN IN DB
    private async refreshToken(userId: string, agent: string): Promise<Token> {
        const _token = await this.prismaService.token.findFirst({
            where: {
                userId,
                agent,
            },
        });
        const token = _token?.token ?? '';
        // updates if found or creates new
        return this.prismaService.token.upsert({
            where: { token },
            update: {
                token: v4(),
                exp: add(new Date(), { months: 1 }),
            },
            create: {
                token: v4(),
                exp: add(new Date(), { months: 1 }),
                userId,
                agent,
            },
        });
    }

    async providerAuth(email: string, agent: string, provider: Provider) {
        const userExists = await this.userService.findOne(email);
        if (userExists) {
            const existant = await this.userService.save({ email, provider }).catch((err) => {
                this.logger.error(err);
                return null;
            });
            return this.generateTokens(existant, agent);
        }

        const user = await this.userService.save({ email, provider }).catch((err) => {
            this.logger.error(err);
            return null;
        });
        if (!user) {
            throw new BadRequestException();
        }
        return this.generateTokens(user, agent);
    }
}
