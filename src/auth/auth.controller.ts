import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  async register(@Body() registerDto: { email: string; password: string; name: string }) {
    return this.authService.register(registerDto.email, registerDto.password, registerDto.name);
  }

  @Get('profile')
  async getProfile() {
    // In a real app, this would use JWT guard
    return {
      id: '1',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'admin',
    };
  }

  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
