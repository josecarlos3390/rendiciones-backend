import { Module } from '@nestjs/common';
import { RendMService }          from './rend-m.service';
import { RendMController }       from './rend-m.controller';
import { RendMHanaRepository }   from './repositories/rend-m.hana.repository';
import { DatabaseModule }        from '../../database/database.module';
import { PerfilesModule }        from '../perfiles/perfiles.module';

@Module({
  imports: [DatabaseModule, PerfilesModule],
  controllers: [RendMController],
  providers: [
    RendMService,
    RendMHanaRepository,
    {
      provide:    'REND_M_REPOSITORY',
      inject:     [RendMHanaRepository],
      useFactory: (hanaRepo: RendMHanaRepository) => hanaRepo,
    },
  ],
  exports: [RendMService],
})
export class RendMModule {}