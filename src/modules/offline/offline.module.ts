import { Module } from "@nestjs/common";
import { OfflineController } from "./offline.controller";
import { OfflineRepository } from "./repositories/offline.repository";
import { OFFLINE_REPOSITORY } from "./repositories/offline.repository.interface";

@Module({
  controllers: [OfflineController],
  providers: [
    {
      provide: OFFLINE_REPOSITORY,
      useClass: OfflineRepository,
    },
  ],
})
export class OfflineModule {}
