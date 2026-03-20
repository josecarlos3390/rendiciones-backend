import { Module } from '@nestjs/common';
import { DocumentosService }        from './documentos.service';
import { DocumentosController }     from './documentos.controller';
import { DocumentosHanaRepository } from './repositories/documentos.hana.repository';

@Module({
  imports: [],
  controllers: [DocumentosController],
  providers: [
    DocumentosService,
    DocumentosHanaRepository,
    {
      provide:    'DOCUMENTOS_REPOSITORY',
      inject:     [DocumentosHanaRepository],
      useFactory: (repo: DocumentosHanaRepository) => repo,
    },
  ],
  exports: [DocumentosService],
})
export class DocumentosModule {}