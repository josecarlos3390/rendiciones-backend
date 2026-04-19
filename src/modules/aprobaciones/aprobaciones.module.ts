import { Module } from "@nestjs/common";
import { AprobacionesController } from "./aprobaciones.controller";
import { AprobacionesService } from "./aprobaciones.service";
import { AprobacionesHanaRepository } from "./repositories/aprobaciones.hana.repository";
import { APROBACIONES_REPOSITORY } from "./repositories/aprobaciones.repository.interface";
import { RendMModule } from "../rend-m/rend-m.module";

@Module({
  imports: [RendMModule],
  controllers: [AprobacionesController],
  providers: [
    AprobacionesService,
    AprobacionesHanaRepository,
    {
      provide: APROBACIONES_REPOSITORY,
      inject: [AprobacionesHanaRepository],
      useFactory: (hanaRepo: AprobacionesHanaRepository) => hanaRepo,
    },
  ],
  exports: [AprobacionesService],
})
export class AprobacionesModule {}
