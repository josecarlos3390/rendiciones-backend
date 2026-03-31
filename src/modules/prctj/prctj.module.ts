import { Module }            from '@nestjs/common';
import { PrctjService }      from './prctj.service';
import { PrctjController }   from './prctj.controller';
import { PrctjHanaRepository } from './repositories/prctj.hana.repository';
import { RendDModule }       from '../rend-d/rend-d.module';
import { RendMModule }       from '../rend-m/rend-m.module';

@Module({
  imports:     [RendDModule, RendMModule],
  controllers: [PrctjController],
  providers:   [PrctjService, PrctjHanaRepository],
  exports:     [PrctjService, PrctjHanaRepository],
})
export class PrctjModule {}