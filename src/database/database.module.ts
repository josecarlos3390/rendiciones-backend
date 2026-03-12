import { Module, Global } from '@nestjs/common';
import { HanaService } from './hana.service';

@Global()
@Module({
  providers: [HanaService],
  exports:   [HanaService],
})
export class DatabaseModule {}
