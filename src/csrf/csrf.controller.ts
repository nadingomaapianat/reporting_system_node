import { Controller, Get, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { CsrfService } from './csrf.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('csrf')
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  @Public()
  @Get('token')
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    let csrfToken = (req as any).cookies?.['csrfToken'];

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


