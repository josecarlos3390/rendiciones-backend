import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger, Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IUsersRepository, USERS_REPOSITORY } from './repositories/users.repository.interface';
import { CreateUserDto }  from './dto/create-user.dto';
import { UpdateUserDto }  from './dto/update-user.dto';
import { RendU }          from './interfaces/rend-u.interface';

/**
 * UsersService — solo lógica de negocio.
 * No sabe nada de SQL, HANA ni SQL Server.
 * Toda la persistencia va a través de IUsersRepository.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly repo: IUsersRepository,
  ) {}

  /**
   * Detecta si un hash es MD5 (32 caracteres hex)
   */
  private isMD5Hash(hash: string): boolean {
    return /^[a-f0-9]{32}$/i.test(hash);
  }

  /**
   * Detecta si es base64
   */
  private isBase64(str: string): boolean {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0 && str.length > 0;
  }

  /**
   * Decodifica base64
   */
  private decodeBase64(str: string): string | null {
    try {
      return Buffer.from(str, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Hashea con MD5 (para compatibilidad con migración)
   */
  private md5Hash(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  async findAll(): Promise<RendU[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<RendU> {
    const user = await this.repo.findOne(id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async findByLogin(login: string): Promise<RendU | null> {
    return this.repo.findByLogin(login);
  }

  async create(dto: CreateUserDto): Promise<RendU> {
    dto.login = dto.login.trim().toLowerCase();

    if (dto.login.length > 10) {
      throw new BadRequestException('El login no puede superar 10 caracteres');
    }

    const existing = await this.repo.findByLogin(dto.login);
    if (existing) throw new ConflictException(`Ya existe un usuario con el login "${dto.login}"`);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const expStr = dto.fechaExpiracion ?? (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    })();

    const nextId = await this.repo.getNextId();

    const user = await this.repo.create(dto, hashedPassword, nextId, expStr);
    this.logger.log(`Usuario creado: ${dto.login}`);
    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<RendU> {
    await this.findOne(id);

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const { affected } = await this.repo.update(id, dto, hashedPassword);
    if (affected === 0 && !dto.password) return this.findOne(id);

    return this.findOne(id);
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const hash = await this.repo.getPasswordHash(userId);
    if (!hash) throw new NotFoundException('Usuario no encontrado');

    // Verificar contraseña actual (soporta base64, MD5 y bcrypt)
    let isValid = false;
    
    if (this.isBase64(hash)) {
      // Es base64
      const decoded = this.decodeBase64(hash);
      isValid = decoded === currentPassword;
      this.logger.debug(`Verificando password BASE64 para usuario ${userId}: ${isValid}`);
    }
    else if (this.isMD5Hash(hash)) {
      // Es MD5
      const md5Password = this.md5Hash(currentPassword);
      isValid = md5Password.toLowerCase() === hash.toLowerCase();
      this.logger.debug(`Verificando password MD5 para usuario ${userId}: ${isValid}`);
    } else {
      // Es bcrypt
      isValid = await bcrypt.compare(currentPassword, hash);
    }
    
    if (!isValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    // Siempre guardar la nueva contraseña en bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.repo.updatePassword(userId, hashed);
    
    this.logger.log(`Password actualizado para usuario ${userId} (migrado a bcrypt)`);

    return { message: 'Contraseña actualizada correctamente' };
  }
}
