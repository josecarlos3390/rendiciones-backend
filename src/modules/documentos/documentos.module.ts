import { Module } from '@nestjs/common';
import { DocumentosService }        from './documentos.service';
import { DocumentosController }     from './documentos.controller';
import { DocumentosHanaRepository } from './repositories/documentos.hana.repository';
import { DatabaseModule }           from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
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
