import { Injectable, Inject } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IUsersRepository }   from './users.repository.interface';
import { RendU }              from '../interfaces/rend-u.interface';
import { CreateUserDto }      from '../dto/create-user.dto';
import { UpdateUserDto }      from '../dto/update-user.dto';

const SAFE_COLS = `
  "U_IdU", "U_Login", "U_NomUser", "U_NomSup", "U_SuperUser",
  "U_Estado", "U_AppRend", "U_AppConf", "U_AppExtB", "U_AppUpLA",
  "U_GenDocPre", "U_FECHAEXPIRACION", "U_FIJARNR",
  "U_NR1", "U_NR2", "U_NR3", "U_NR4", "U_NR5", "U_FIJARSALDO"
`;

@Injectable()
export class UsersHanaRepository implements IUsersRepository {
  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }
  private get dbType(): string {
    return this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
  }


  private get DB(): string {
    return tbl(this.schema, 'REND_U', this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<RendU[]> {
    return this.db.query<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} ORDER BY "U_NomUser"`,
    );
  }

  async findOne(id: number): Promise<RendU | null> {
    return this.db.queryOne<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_IdU" = ?`,
      [id],
    );
  }

  async findByLogin(login: string): Promise<RendU | null> {
    return this.db.queryOne<RendU>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_Login" = ?`,
      [login],
    );
  }

  async getNextId(): Promise<number> {
    const row = await this.db.queryOne<any>(
      `SELECT COALESCE(MAX("U_IdU"), 0) + 1 AS NEXT_ID FROM ${this.DB}`,
    );
    return this.db.col(row, 'NEXT_ID') ?? 1;
  }

  async getPasswordHash(userId: number): Promise<string | null> {
    const row = await this.db.queryOne<Record<string, string>>(
      `SELECT "U_Pass" FROM ${this.DB} WHERE "U_IdU" = ?`,
      [userId],
    );
    if (!row) return null;
    return this.db.col(row, 'U_Pass');
  }

  async create(
    dto:            CreateUserDto,
    hashedPassword: string,
    nextId:         number,
    expStr:         string,
  ): Promise<RendU> {
    await this.db.execute(
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
        dto.supervisorName ?? '',
        dto.superUser      ?? 0,
        dto.estado         ?? '1',
        dto.appRend        ?? '1',
        dto.appConf        ?? '0',
        dto.appExtB        ?? '0',
        dto.appUpLA        ?? '0',
        dto.genDocPre      ?? '0',
        expStr,
        dto.fijarNr        ?? '0',
        dto.nr1            ?? '',
        dto.nr2            ?? '',
        dto.nr3            ?? '',
        dto.nr4            ?? '',
        dto.nr5            ?? '',
        dto.fijarSaldo     ?? '0',
      ],
    );

    return this.findByLogin(dto.login);
  }

  async update(
    id:              number,
    dto:             UpdateUserDto,
    hashedPassword?: string,
  ): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (dto.name            !== undefined) { setParts.push('"U_NomUser" = ?');         params.push(dto.name); }
    if (dto.supervisorName  !== undefined) { setParts.push('"U_NomSup" = ?');          params.push(dto.supervisorName); }
    if (dto.superUser       !== undefined) { setParts.push('"U_SuperUser" = ?');       params.push(dto.superUser); }
    if (dto.estado          !== undefined) { setParts.push('"U_Estado" = ?');          params.push(dto.estado); }
    if (dto.appRend         !== undefined) { setParts.push('"U_AppRend" = ?');         params.push(dto.appRend); }
    if (dto.appConf         !== undefined) { setParts.push('"U_AppConf" = ?');         params.push(dto.appConf); }
    if (dto.appExtB         !== undefined) { setParts.push('"U_AppExtB" = ?');         params.push(dto.appExtB); }
    if (dto.appUpLA         !== undefined) { setParts.push('"U_AppUpLA" = ?');         params.push(dto.appUpLA); }
    if (dto.genDocPre       !== undefined) { setParts.push('"U_GenDocPre" = ?');       params.push(dto.genDocPre); }
    if (dto.fijarNr         !== undefined) { setParts.push('"U_FIJARNR" = ?');         params.push(dto.fijarNr); }
    if (dto.nr1             !== undefined) { setParts.push('"U_NR1" = ?');             params.push(dto.nr1); }
    if (dto.nr2             !== undefined) { setParts.push('"U_NR2" = ?');             params.push(dto.nr2); }
    if (dto.nr3             !== undefined) { setParts.push('"U_NR3" = ?');             params.push(dto.nr3); }
    if (dto.nr4             !== undefined) { setParts.push('"U_NR4" = ?');             params.push(dto.nr4); }
    if (dto.nr5             !== undefined) { setParts.push('"U_NR5" = ?');             params.push(dto.nr5); }
    if (dto.fijarSaldo      !== undefined) { setParts.push('"U_FIJARSALDO" = ?');      params.push(dto.fijarSaldo); }
    if (dto.fechaExpiracion !== undefined) { setParts.push('"U_FECHAEXPIRACION" = ?'); params.push(dto.fechaExpiracion); }
    if (hashedPassword)                    { setParts.push('"U_Pass" = ?');            params.push(hashedPassword); }

    if (!setParts.length) return { affected: 0 };

    params.push(id);
    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_IdU" = ?`,
      params,
    );
    return { affected };
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.DB} SET "U_Pass" = ? WHERE "U_IdU" = ?`,
      [hashedPassword, userId],
    );
  }
}