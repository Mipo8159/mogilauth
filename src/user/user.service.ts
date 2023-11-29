import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { convertToSecondsUtil } from '@common/utils';

@Injectable()
export class UserService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly configService: ConfigService,
        private readonly prismaService: PrismaService,
    ) {}

    async save(user: Partial<User>) {
        const hashedPassword = user?.password ? this.hashPass(user.password) : null;
        const savedUser = await this.prismaService.user.upsert({
            where: {
                email: user.email,
            },
            update: {
                password: hashedPassword ?? undefined,
                provider: user?.provider ?? undefined,
                roles: user?.roles ?? undefined,
                isBlocked: user?.isBlocked ?? undefined,
            },
            create: {
                email: user.email,
                password: hashedPassword,
                provider: user?.provider,
                roles: ['USER'],
            },
        });
        await this.cacheManager.set(savedUser.id, savedUser);
        await this.cacheManager.set(savedUser.email, savedUser);
        return savedUser;
    }

    // THIS SERVICE IS RUN MULTIPLE TIMES (TOKEN-CHECK + SELF) [NEEDS CACHING]
    async findOne(srchIdx: string, isReset = false): Promise<User> {
        if (isReset) {
            await this.cacheManager.del(srchIdx); // Remove Cache (Login)
        }
        const user = await this.cacheManager.get<User>(srchIdx);
        if (!user) {
            const user = await this.prismaService.user.findFirst({
                where: {
                    OR: [{ id: srchIdx }, { email: srchIdx }],
                },
            });
            if (!user) {
                return null;
            }
            await this.cacheManager.set(srchIdx, user, convertToSecondsUtil(this.configService.get('JWT_EXP')));
            return user;
        }
        return user;
    }

    async delete(id: string, user: User) {
        if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
            throw new ForbiddenException();
        }

        await Promise.all([this.cacheManager.del(id), this.cacheManager.del(user.email)]);
        return this.prismaService.user.delete({
            where: { id },
            select: { id: true },
        });
    }

    private hashPass(pass: string) {
        return hashSync(pass, genSaltSync());
    }
}
