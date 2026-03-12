import { Module } from '@nestjs/common';
import { PerfilesService }          from './perfiles.service';
import { PerfilesController }       from './perfiles.controller';
import { PerfilesHanaRepository }   from './repositories/perfiles.hana.repository';
import { DatabaseModule }           from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PerfilesController],
  providers: [
    PerfilesService,
    PerfilesHanaRepository,
    {
      provide:    'PERFILES_REPOSITORY',
      inject:     [PerfilesHanaRepository],
      useFactory: (hanaRepo: PerfilesHanaRepository) => hanaRepo,
    },
  ],
  exports: [PerfilesService],
})
export class PerfilesModule {}
