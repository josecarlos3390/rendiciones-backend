import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../database/hana.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RendU } from './interfaces/rend-u.interface';
import * as bcrypt from 'bcryptjs';

const SAFE_COLS = `
  "U_IdU", "U_Login", "U_NomUser", "U_NomSup", "U_SuperUser",
  "U_Estado", "U_AppRend", "U_AppConf", "U_AppExtB", "U_AppUpLA",
  "U_GenDocPre", "U_FECHAEXPIRACION", "U_FIJARNR",
  "U_NR1", "U_NR2", "U_NR3", "U_NR4", "U_NR5", "U_FIJARSALDO"
`;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get DB(): string {
    return `"${this.schema}"."REND_U"`;
  }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<RendU[]> {
    return this.hanaService.query<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} ORDER BY "U_NomUser"`,
    );
  }

  async findOne(id: number): Promise<RendU> {
    const rows = await this.hanaService.query<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_IdU" = ?`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return rows[0];
  }

  async findByLogin(login: string): Promise<RendU | null> {
    const rows = await this.hanaService.query<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_Login" = ?`,
      [login],
    );
    return rows[0] ?? null;
  }

  async create(dto: CreateUserDto) {
    dto.login = dto.login.trim().toLowerCase();

    if (dto.login.length > 10) {
      throw new BadRequestException('El login no puede superar 10 caracteres');
    }

    const existing = await this.findByLogin(dto.login);
    if (existing) throw new ConflictException(`Ya existe un usuario con el login "${dto.login}"`);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const expStr = dto.fechaExpiracion ?? (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    })();

    const seqRows = await this.hanaService.query<any>(
      `SELECT COALESCE(MAX("U_IdU"), 0) + 1 AS NEXT_ID FROM ${this.DB}`,
    );
    const nextId = seqRows[0]?.NEXT_ID ?? 1;

    await this.hanaService.execute(
      `INSERT INTO ${this.DB}
         ("U_IdU", "U_Login", "U_Pass", "U_NomUser", "U_NomSup", "U_SuperUser",
          "U_Estado", "U_AppRend", "U_AppConf", "U_AppExtB", "U_AppUpLA",
          "U_GenDocPre", "U_FECHAEXPIRACION", "U_FIJARNR",
          "U_NR1", "U_NR2", "U_NR3", "U_NR4", "U_NR5", "U_FIJARSALDO")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        dto.login,
        hashedPassword,
        dto.name,
        dto.supervisorName  ?? '',
        dto.superUser       ?? 0,
        dto.estado          ?? '1',
        dto.appRend         ?? '1',
        dto.appConf         ?? '0',
        dto.appExtB         ?? '0',
        dto.appUpLA         ?? '0',
        dto.genDocPre       ?? '0',
        expStr,
        dto.fijarNr         ?? '0',
        dto.nr1             ?? '',
        dto.nr2             ?? '',
        dto.nr3             ?? '',
        dto.nr4             ?? '',
        dto.nr5             ?? '',
        dto.fijarSaldo      ?? '0',
      ],
    );

    this.logger.log(`Usuario creado: ${dto.login}`);
    return this.findByLogin(dto.login);
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const setParts: string[] = [];
    const params:   any[]    = [];

    if (dto.name            !== undefined) { setParts.push('"U_NomUser" = ?');        params.push(dto.name); }
    if (dto.supervisorName  !== undefined) { setParts.push('"U_NomSup" = ?');         params.push(dto.supervisorName); }
    if (dto.superUser       !== undefined) { setParts.push('"U_SuperUser" = ?');      params.push(dto.superUser); }
    if (dto.estado          !== undefined) { setParts.push('"U_Estado" = ?');         params.push(dto.estado); }
    if (dto.appRend         !== undefined) { setParts.push('"U_AppRend" = ?');        params.push(dto.appRend); }
    if (dto.appConf         !== undefined) { setParts.push('"U_AppConf" = ?');        params.push(dto.appConf); }
    if (dto.appExtB         !== undefined) { setParts.push('"U_AppExtB" = ?');        params.push(dto.appExtB); }
    if (dto.appUpLA         !== undefined) { setParts.push('"U_AppUpLA" = ?');        params.push(dto.appUpLA); }
    if (dto.genDocPre       !== undefined) { setParts.push('"U_GenDocPre" = ?');      params.push(dto.genDocPre); }
    if (dto.fijarNr         !== undefined) { setParts.push('"U_FIJARNR" = ?');        params.push(dto.fijarNr); }
    if (dto.nr1             !== undefined) { setParts.push('"U_NR1" = ?');            params.push(dto.nr1); }
    if (dto.nr2             !== undefined) { setParts.push('"U_NR2" = ?');            params.push(dto.nr2); }
    if (dto.nr3             !== undefined) { setParts.push('"U_NR3" = ?');            params.push(dto.nr3); }
    if (dto.nr4             !== undefined) { setParts.push('"U_NR4" = ?');            params.push(dto.nr4); }
    if (dto.nr5             !== undefined) { setParts.push('"U_NR5" = ?');            params.push(dto.nr5); }
    if (dto.fijarSaldo      !== undefined) { setParts.push('"U_FIJARSALDO" = ?');     params.push(dto.fijarSaldo); }
    if (dto.fechaExpiracion !== undefined) { setParts.push('"U_FECHAEXPIRACION" = ?'); params.push(dto.fechaExpiracion); }
    if (dto.password) {
      const hashed = await bcrypt.hash(dto.password, 10);
      setParts.push('"U_Pass" = ?');
      params.push(hashed);
    }

    if (!setParts.length) return this.findOne(id);

    params.push(id);
    await this.hanaService.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_IdU" = ?`,
      params,
    );

    return this.findOne(id);
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const rows = await this.hanaService.query<Record<string, string>>(
      `SELECT "U_Pass" FROM ${this.DB} WHERE "U_IdU" = ?`,
      [userId],
    );
    if (!rows.length) throw new NotFoundException('Usuario no encontrado');

    // HanaService.col() normaliza el case del nombre de columna según la versión del driver
    const pass = HanaService.col(rows[0], 'U_Pass');
    const isValid = await bcrypt.compare(currentPassword, pass);
    if (!isValid) throw new BadRequestException('Contrasena actual incorrecta');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.hanaService.execute(
      `UPDATE ${this.DB} SET "U_Pass" = ? WHERE "U_IdU" = ?`,
      [hashed, userId],
    );

    return { message: 'Contrasena actualizada correctamente' };
  }
}