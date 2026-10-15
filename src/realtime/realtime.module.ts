import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { TokenBlocklistService } from '../auth/token-blocklist.service';

@Module({
  providers: [RealtimeService, RealtimeGateway, TokenBlocklistService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
