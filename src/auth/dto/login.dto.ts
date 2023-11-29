import { IsEmail, IsString, Min } from 'class-validator';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @Min(6)
    password: string;
}
