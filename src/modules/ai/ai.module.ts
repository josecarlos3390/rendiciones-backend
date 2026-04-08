import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiConfigService } from './services/ai-config.service';
import { AppModeService } from './services/app-mode.service';
import { ClasificadorService } from './services/clasificador.service';
import { ValidadorSiatService } from './services/validador-siat.service';
import { AnalisisRendicionService } from './services/analisis-rendicion.service';
import { ChatbotService } from './services/chatbot.service';
import { ClaudeService } from './services/claude.service';
import { PdfProcessorService } from './services/pdf-processor.service';
import { InvoiceExtractorService } from './services/invoice-extractor.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { SapService } from '../sap/sap.service';
import { CoaModule } from '../coa/coa.module';
import { NormasModule } from '../normas/normas.module';
import { ProyectosModule } from '../proyectos/proyectos.module';
import { RendDModule } from '../rend-d/rend-d.module';
import { DatabaseModule } from '../../database/database.module';
import aiConfig from '../../config/ai.config';
import appModeConfig from '../../config/app-mode.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    ConfigModule.forFeature(appModeConfig),
    HttpModule,
    DatabaseModule, // Necesario para SapService
    CoaModule,      // Provee CoaService
    NormasModule,   // Provee NormasService
    ProyectosModule, // Provee ProyectosService
    RendDModule,    // Provee RendDService para batch processor
  ],
  controllers: [AiController],
  providers: [
    AiConfigService,
    AppModeService,
    ClasificadorService,
    ValidadorSiatService,
    AnalisisRendicionService,
    ChatbotService,
    ClaudeService,
    PdfProcessorService,
    InvoiceExtractorService,
    BatchProcessorService,
    SapService, // Servicio para datos de SAP
  ],
  exports: [
    AiConfigService,
    AppModeService,
    InvoiceExtractorService,
    BatchProcessorService,
  ],
})
export class AiModule {}
