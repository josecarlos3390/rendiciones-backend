import { Module } from '@nestjs/common';
import { TipoDocSapController }  from './tipo-doc-sap.controller';
import { TipoDocSapService }     from './tipo-doc-sap.service';
import { TipoDocSapRepository }  from './repositories/tipo-doc-sap.hana.repository';

@Module({
  controllers: [TipoDocSapController],
  providers:   [TipoDocSapService, TipoDocSapRepository],
  exports:     [TipoDocSapService],
})
export class TipoDocSapModule {}