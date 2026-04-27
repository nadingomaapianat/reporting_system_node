import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { getJwtSecret } from './jwt-secret';
import { DEFAULT_MAIN_BACKEND_URL, getResolvedMainBackendUrl, isImplicitMainBackendUrl } from './main-backend-config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        return {
          secret: getJwtSecret(),
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '2h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtModule, AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  onModuleInit(): void {
    const resolved = getResolvedMainBackendUrl();
    if (isImplicitMainBackendUrl() && resolved === DEFAULT_MAIN_BACKEND_URL) {
      this.logger.warn(
        `MAIN_BACKEND_URL is unset; using default ${DEFAULT_MAIN_BACKEND_URL}. ` +
          `If POST ${DEFAULT_MAIN_BACKEND_URL}/entry/validate returns only success+user_id, ` +
          `reporting JWTs will lack permissions — set MAIN_BACKEND_URL to your main API whose validate returns permissions[] ` +
          `(see new_adib_backend EntryController), or extend dcc-backend validate the same way.`,
      );
    }
  }
}
