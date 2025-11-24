import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@Controller('csrf')
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  @Get('token')
  getToken(@Req() req: Request, @Res() res: Response) {
    let csrfToken = req.cookies?.csrfToken;

    if (!csrfToken) {
      csrfToken = this.csrfService.generateToken();
      res.cookie('csrfToken', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
    }

    return res.status(200).json({ csrfToken });
  }
}

