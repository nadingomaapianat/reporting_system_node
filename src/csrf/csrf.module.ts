import { Module } from '@nestjs/common';
import { CsrfService } from './csrf.service';
import { CsrfController } from './csrf.controller';

@Module({
  providers: [CsrfService],
  controllers: [CsrfController],
})
export class CsrfModule {}



