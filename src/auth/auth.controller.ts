import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as jwt from 'jsonwebtoken';

@Controller('api/auth')
export class AuthController {

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    // User is attached to request by JwtAuthGuard
    const user = req.user;
    return {
      id: user?.id || '1',
      email: user?.email || 'demo@example.com',
      name: user?.name || 'Demo User',
      role: user?.role || 'admin',
    };
  }

  @Post('validate-token')
  async validateToken(@Body() body: { token: string }): Promise<any> {
    const { token } = body;

    if (!token) {
      return { success: false, message: 'Token is required' };
    }

    try {
      const secretKey = 'GRC_ADIB_2025';
      const decoded: any = jwt.verify(token, secretKey);

      // Extract user info from token - matching v2_backend format exactly
      const { group, title, name, id } = decoded;

      return {
        success: true,
        data: { group, title, name, id },
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return { success: false, message: 'Invalid or expired token' };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any): Promise<any> {
    try {
      // Note: Session management is handled by v2_backend
      // This endpoint validates the token and returns success
      // The actual logout (isSessionActive update) should be done via v2_backend
      
      return {
        isSuccess: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        isSuccess: false,
        message: 'An error occurred during logout',
      };
    }
  }
}
