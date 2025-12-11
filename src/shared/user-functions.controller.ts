import { Controller, Get, Req } from '@nestjs/common';
import { UserFunctionAccessService } from './user-function-access.service';

@Controller('api/user/functions')
export class UserFunctionsController {
  constructor(private readonly userFunctionAccess: UserFunctionAccessService) {}

  @Get()
  async getUserFunctions(@Req() req: any) {
    const functions = await this.userFunctionAccess.getUserFunctions(
      req.user.id,
      req.user.groupName,
    );
    return functions;
  }
}
