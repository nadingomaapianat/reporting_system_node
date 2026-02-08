import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET') || config.get<string>('JWT_SECRET_KEY');
        if (process.env.NODE_ENV === 'production' && !secret) {
          throw new Error('JWT_SECRET (or JWT_SECRET_KEY) must be set in production');
        }
        return {
          secret: secret || 'GRC_ADIB_2025',
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
