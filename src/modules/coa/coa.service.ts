import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  ICoaRepository,
  COA_REPOSITORY,
} from './repositories/coa.repository.interface';
import { CuentaCOA, CoaFiltro } from './interfaces/coa.interface';
import { CrearCuentaDto, ActualizarCuentaDto } from './dto/coa.dto';

@Injectable()
export class CoaService {
  private readonly logger = new Logger(CoaService.name);

  constructor(
    @Inject(COA_REPOSITORY)
    private readonly repository: ICoaRepository,
  ) {}

  /**
   * Obtiene todas las cuentas aplicando filtros opcionales
   */
  async findAll(filtro?: CoaFiltro): Promise<CuentaCOA[]> {
    this.logger.debug(`Buscando cuentas con filtro: ${JSON.stringify(filtro)}`);
    return this.repository.findAll(filtro);
  }

  /**
   * Obtiene una cuenta por su código
   */
  async findByCode(code: string): Promise<CuentaCOA> {
    this.logger.debug(`Buscando cuenta con código: ${code}`);
    const cuenta = await this.repository.findByCode(code);
    
    if (!cuenta) {
      throw new NotFoundException(`Cuenta con código '${code}' no encontrada`);
    }
    
    return cuenta;
  }

  /**
   * Crea una nueva cuenta
   */
  async create(dto: CrearCuentaDto): Promise<CuentaCOA> {
    this.logger.debug(`Creando cuenta: ${JSON.stringify(dto)}`);
    
    // Validaciones de negocio
    if (!dto.code || dto.code.trim() === '') {
      throw new ConflictException('El código de la cuenta es obligatorio');
    }
    
    if (!dto.name || dto.name.trim() === '') {
      throw new ConflictException('El nombre de la cuenta es obligatorio');
    }

    // Validar formato del código (solo números y puntos, típico de plan de cuentas)
    const codeNormalized = dto.code.trim().toUpperCase();
    if (!/^[\d.]+$/.test(codeNormalized)) {
      this.logger.warn(`Código de cuenta con caracteres no numéricos: ${codeNormalized}`);
      // No bloqueamos, solo advertimos - algunas empresas usan letras
    }

    const exists = await this.repository.exists(codeNormalized);
    if (exists) {
      throw new ConflictException(
        `Ya existe una cuenta con el código '${codeNormalized}'`,
      );
    }

    return this.repository.create({
      ...dto,
      code: codeNormalized,
    });
  }

  /**
   * Actualiza una cuenta existente
   */
  async update(code: string, dto: ActualizarCuentaDto): Promise<CuentaCOA> {
    this.logger.debug(`Actualizando cuenta ${code}: ${JSON.stringify(dto)}`);
    
    // Validar que existe
    await this.findByCode(code);

    // Normalizar nombre si se proporciona
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (trimmed === '') {
        throw new ConflictException('El nombre de la cuenta no puede estar vacío');
      }
      dto.name = trimmed;
    }

    return this.repository.update(code, dto);
  }

  /**
   * Elimina una cuenta
   */
  async remove(code: string): Promise<{ affected: number }> {
    this.logger.debug(`Eliminando cuenta con código: ${code}`);
    
    // Validar que existe
    await this.findByCode(code);

    return this.repository.remove(code);
  }

  /**
   * Cambia el estado activo/inactivo de una cuenta
   */
  async toggleActive(code: string): Promise<CuentaCOA> {
    this.logger.debug(`Cambiando estado activo de cuenta: ${code}`);
    
    const cuenta = await this.findByCode(code);
    return this.repository.update(code, { activa: !cuenta.activa });
  }
}
