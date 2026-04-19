import { Module } from "@nestjs/common";
import { RendDService } from "./rend-d.service";
import { RendDController } from "./rend-d.controller";
import { RendDHanaRepository } from "./repositories/rend-d.hana.repository";
import { RendMModule } from "../rend-m/rend-m.module";
import { CoaModule } from "../coa/coa.module";
import { ProyectosModule } from "../proyectos/proyectos.module";
import { ProvModule } from "../prov/prov.module";
import { NormasModule } from "../normas/normas.module";

@Module({
  imports: [RendMModule, CoaModule, ProyectosModule, ProvModule, NormasModule],
  controllers: [RendDController],
  providers: [
    RendDService,
    RendDHanaRepository,
    {
      provide: "REND_D_REPOSITORY",
      inject: [RendDHanaRepository],
      useFactory: (hanaRepo: RendDHanaRepository) => hanaRepo,
    },
  ],
  exports: [RendDService, "REND_D_REPOSITORY"],
})
export class RendDModule {}
