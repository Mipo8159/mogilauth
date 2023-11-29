import { PassMatch } from '@common/decorators';
import { IsEmail, IsString, Min, Validate } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @Min(6)
    password: string;

    @IsString()
    @Min(6)
    @Validate(PassMatch)
    cf_password: string;
}
