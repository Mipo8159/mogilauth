import { RegisterDto } from '@auth/dto';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'PassMatch', async: false })
export class PassMatch implements ValidatorConstraintInterface {
    validate(passwordRepeat: string, args: ValidationArguments) {
        // HAS ACCESS TO DTO CLASS (obj)
        const obj = args.object as RegisterDto;
        return obj.password === passwordRepeat;
    }

    defaultMessage(): string {
        return 'Passwords do not match';
    }
}
