import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // NO NEED TO IMPORT
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
