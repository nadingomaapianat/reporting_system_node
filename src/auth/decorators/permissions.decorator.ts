import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (page: string, actions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, { page, actions });



