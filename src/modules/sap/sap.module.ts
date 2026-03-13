import { Module } from '@nestjs/common';
import { SapService }    from './sap.service';
import { SapController } from './sap.controller';

@Module({
  controllers: [SapController],
  providers:   [SapService],
  exports:     [SapService],   // exportamos por si otros módulos lo necesitan
})
export class SapModule {}