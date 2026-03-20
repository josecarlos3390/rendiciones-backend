import { Module } from '@nestjs/common';
import { ProvService }        from './prov.service';
import { ProvController }     from './prov.controller';
import { ProvHanaRepository } from './repositories/prov.hana.repository';
import { PROV_REPOSITORY }    from './repositories/prov.repository.interface';

@Module({
  controllers: [ProvController],
  providers: [
    ProvService,
    ProvHanaRepository,
    { provide: PROV_REPOSITORY, useExisting: ProvHanaRepository },
  ],
  exports: [ProvService],
})
export class ProvModule {}