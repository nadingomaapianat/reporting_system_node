import { SetMetadata } from '@nestjs/common';

/** Marks a route (or controller) as exempt from global `JwtAuthGuard` — use sparingly (login, CSRF, health). */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
