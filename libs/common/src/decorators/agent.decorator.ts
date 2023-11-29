import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Requesterer (PostMan)
export const Agent = createParamDecorator((key: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
});
