import { Module } from '@nestjs/common';
import { MainBackendBridgeService } from './main-backend-bridge.service';
import { MainBackendProxyController } from './main-backend-proxy.controller';

@Module({
  controllers: [MainBackendProxyController],
  providers: [MainBackendBridgeService],
})
export class MainBackendModule {}
