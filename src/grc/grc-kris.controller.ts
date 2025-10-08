import { Controller, Get, Query } from '@nestjs/common';
import { GrcKrisService } from './grc-kris.service';

@Controller('api/grc/kris')
export class GrcKrisController {
  constructor(private readonly grcKrisService: GrcKrisService) {}

  @Get()
  async getKrisDashboard(@Query('timeframe') timeframe?: string) {
    return this.grcKrisService.getKrisDashboard(timeframe);
  }

  @Get('export')
  async exportKris(
    @Query('format') format: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.grcKrisService.exportKris(format, timeframe);
  }
}
