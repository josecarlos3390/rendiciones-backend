import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { ICuentasCabeceraRepository } from './repositories/cuentas-cabecera.repository.interface';
import { CreateCuentaCabeceraDto } from './dto/create-cuenta-cabecera.dto';

@Injectable()
export class CuentasCabeceraService {
  private readonly logger = new Logger(CuentasCabeceraService.name);

  constructor(
    @Inject('CUENTAS_CABECERA_REPOSITORY')
    private readonly repo: ICuentasCabeceraRepository,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  findByPerfil(idPerfil: number) {
    return this.repo.findByPerfil(idPerfil);
  }

  async create(dto: CreateCuentaCabeceraDto) {
    const exists = await this.repo.exists(dto.idPerfil, dto.cuentaSys);
    if (exists) {
      throw new ConflictException(
        `La cuenta "${dto.cuentaSys}" ya está registrada en la cabecera de este perfil`,
      );
    }
    const result = await this.repo.create(dto);
    this.logger.log(`Cuenta cabecera ${dto.cuentaSys} agregada al perfil ${dto.idPerfil}`);
    return result;
  }

  async remove(idPerfil: number, cuentaSys: string) {
    const exists = await this.repo.exists(idPerfil, cuentaSys);
    if (!exists) {
      throw new NotFoundException(
        `Cuenta "${cuentaSys}" no encontrada en la cabecera del perfil ${idPerfil}`,
      );
    }
    return this.repo.remove(idPerfil, cuentaSys);
  }
}
