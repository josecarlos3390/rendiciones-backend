import { Module }                from '@nestjs/common';
import { RendCmpController }     from './rend-cmp.controller';
import { RendCmpService }        from './rend-cmp.service';
import { RendCmpHanaRepository } from './repositories/rend-cmp.hana.repository';
import { REND_CMP_REPOSITORY }   from './repositories/rend-cmp.repository.interface';

@Module({
  controllers: [RendCmpController],
  providers: [
    RendCmpService,
    { provide: REND_CMP_REPOSITORY, useClass: RendCmpHanaRepository },
  ],
  exports: [RendCmpService, REND_CMP_REPOSITORY],
})
export class RendCmpModule {}