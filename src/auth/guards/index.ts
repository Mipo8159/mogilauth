import { GoogleGuard } from './google.guard';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './role.guard';

export const GUARDS = [JwtGuard, RolesGuard, GoogleGuard];
