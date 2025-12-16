import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  title?: string;
  group?: string;
  groupName?: string;
  permissions?: any;
  createdAt?: string;
  lastLogin?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request: any = context.switchToHttp().getRequest<Request>();
    const cookieToken = (request as any).cookies?.['accessToken'];
    const authHeader = request.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : undefined;
    const token = cookieToken || headerToken;
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const secret = process.env.JWT_SECRET || 'CHANGE_ME_SECRET';
      const decoded = jwt.verify(token, secret) as JwtPayload;
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}


