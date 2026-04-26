import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { getJwtSecret } from './jwt-secret';

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
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [JwtModule, AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
