import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface IcrReportUser {
  id: string;
  fullName: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IcrReportUser => {
    const request = ctx.switchToHttp().getRequest<{
      user: IcrReportUser & { roles: string[] };
    }>();
    return request.user;
  },
);
