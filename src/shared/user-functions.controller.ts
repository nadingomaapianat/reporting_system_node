import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserFunctionAccessService } from './user-function-access.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/user/functions')
@UseGuards(PermissionsGuard)
@Permissions('Dashboard', ['show'])
export class UserFunctionsController {
  constructor(private readonly userFunctionAccess: UserFunctionAccessService) {}

  @Get()
  async getUserFunctions(@Req() req: any) {
    const functions = await this.userFunctionAccess.getUserFunctions(req.user);
    return functions;
  }
}
