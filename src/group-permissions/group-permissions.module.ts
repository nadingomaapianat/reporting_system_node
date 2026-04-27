import { Module } from '@nestjs/common';
import { GroupPermissionsController } from './group-permissions.controller';
import { GroupPermissionsService } from './group-permissions.service';

@Module({
  controllers: [GroupPermissionsController],
  providers: [GroupPermissionsService],
})
export class GroupPermissionsModule {}
