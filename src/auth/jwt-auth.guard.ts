import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Get token from: (1) Authorization Bearer, (2) reporting_node_token cookie, (3) iframe_d_c_c_t_p_1 + iframe_d_c_c_t_p_2 cookies.
 * Iframe token is handled only in reporting backend (not in main backend).
 */
function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const bearer = authHeader.split('Bearer ')[1];
    if (bearer) return bearer;
  }

  const reportingToken = req.cookies?.['reporting_node_token'];
  if (reportingToken) return reportingToken;

  const iframePart1 = req.cookies?.['iframe_d_c_c_t_p_1'];
  const iframePart2 = req.cookies?.['iframe_d_c_c_t_p_2'];
  if (iframePart1) {
    const encoded = `${iframePart1}${iframePart2 || ''}`;
    if (encoded) {
      try {
        return decodeURIComponent(encoded);
      } catch {
        // invalid encoding
      }
    }
  }

  return null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request: any = context.switchToHttp().getRequest<Request>();
    const token = getTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authorization token is missing (use Bearer header or reporting_node_token / iframe_d_c_c_t_p_* cookies)',
      );
    }

    try {
      const decoded = jwt.verify(token, 'GRC_ADIB_2025');
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

