import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * Global database module — provides DatabaseService as a singleton that can be
 * injected into any module without explicit import.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
