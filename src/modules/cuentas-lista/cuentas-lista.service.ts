import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { ICuentasListaRepository } from './repositories/cuentas-lista.repository.interface';
import { CreateCuentaListaDto } from './dto/create-cuenta-lista.dto';

@Injectable()
export class CuentasListaService {
  private readonly logger = new Logger(CuentasListaService.name);

  constructor(
    @Inject('CUENTAS_LISTA_REPOSITORY')
    private readonly repo: ICuentasListaRepository,
  ) {}

  findAll() {
    return this.repo.findAll();
  }

  findByPerfil(idPerfil: number) {
    return this.repo.findByPerfil(idPerfil);
  }

  async create(dto: CreateCuentaListaDto) {
    const exists = await this.repo.existsByPerfilAndCuenta(dto.idPerfil, dto.cuentaSys);
    if (exists) {
      throw new ConflictException(
        `La cuenta "${dto.cuentaSys}" ya está registrada en este perfil`,
      );
    }
    const result = await this.repo.create(dto);
    this.logger.log(`Cuenta ${dto.cuentaSys} agregada al perfil ${dto.idPerfil}`);
    return result;
  }

  async remove(idPerfil: number, cuentaSys: string) {
    const exists = await this.repo.existsByPerfilAndCuenta(idPerfil, cuentaSys);
    if (!exists) {
      throw new NotFoundException(`Cuenta "${cuentaSys}" no encontrada en el perfil ${idPerfil}`);
    }
    return this.repo.remove(idPerfil, cuentaSys);
  }
}
