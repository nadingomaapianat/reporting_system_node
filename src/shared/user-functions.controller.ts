import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserFunctionAccessService } from './user-function-access.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('api/user/functions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('Reporting', ['show'])
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
