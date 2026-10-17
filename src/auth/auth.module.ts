import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TokenBlocklistService } from './token-blocklist.service';
import { LivePermissionsService } from './live-permissions.service';
import { UserSessionService } from './user-session.service';
import { getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        return {
          secret: getJwtSecret(),
          // @nestjs/jwt 11 types expiresIn as number | ms.StringValue; the runtime value is a string like "2h"
          signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '2h') as any },
        };
      },
      inject: [ConfigService],
    }),
    // DatabaseModule is @Global(), so DatabaseService is available without explicit import,
    // but listing it here keeps dependency intent clear.
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    PermissionsGuard,
    TokenBlocklistService,
    LivePermissionsService,
    UserSessionService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtModule, AuthService, JwtAuthGuard, PermissionsGuard, TokenBlocklistService, LivePermissionsService, UserSessionService],
})
export class AuthModule {}
