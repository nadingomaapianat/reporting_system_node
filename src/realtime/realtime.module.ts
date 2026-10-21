import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { TokenBlocklistService } from '../auth/token-blocklist.service';
import { UserSessionService } from '../auth/user-session.service';

@Module({
  providers: [RealtimeService, RealtimeGateway, TokenBlocklistService, UserSessionService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
