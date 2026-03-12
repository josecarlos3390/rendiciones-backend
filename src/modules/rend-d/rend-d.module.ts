import { Module } from '@nestjs/common';
import { RendDService }        from './rend-d.service';
import { RendDController }     from './rend-d.controller';
import { RendDHanaRepository } from './repositories/rend-d.hana.repository';
import { DatabaseModule }      from '../../database/database.module';
import { RendMModule }         from '../rend-m/rend-m.module';

@Module({
  imports: [DatabaseModule, RendMModule],
  controllers: [RendDController],
  providers: [
    RendDService,
    RendDHanaRepository,
    {
      provide:    'REND_D_REPOSITORY',
      inject:     [RendDHanaRepository],
      useFactory: (hanaRepo: RendDHanaRepository) => hanaRepo,
    },
  ],
})
export class RendDModule {}
