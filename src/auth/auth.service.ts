import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../database/interfaces/database.interface';
import { LoginDto }      from './dto/login.dto';
import { JwtPayload }    from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import { tbl } from '../database/db-table.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly DUMMY_HASH =
    '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db:            IDatabaseService,
    private readonly jwtService:    JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get dbType(): string {
    return this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
  }

  private get DB(): string {
    return tbl(this.schema, 'REND_U', this.dbType);
  }

  private toRole(superUser: number): string {
    return superUser === 1 ? 'ADMIN' : 'USER';
  }

  async login(dto: LoginDto) {
    const { password } = dto;
    const username = dto.username.trim().toLowerCase();

    const rows = await this.db.query<any>(
      `SELECT "U_IdU", "U_Login", "U_Pass", "U_SuperUser", "U_NomUser",
              "U_Estado", "U_AppRend", "U_AppConf", "U_FIJARSALDO", "U_FECHAEXPIRACION",
              "U_FIJARNR", "U_NR1", "U_NR2", "U_NR3"
       FROM ${this.DB}
       WHERE LOWER("U_Login") = ?`,
      [username],
    );

    this.logger.debug(`Login rows para "${username}": ${JSON.stringify(rows)}`);

    const user = rows[0] ?? null;

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${username}`);
      await bcrypt.compare(password, this.DUMMY_HASH);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const col = (name: string) => this.db.col(user, name);

    const pass       = col('U_Pass');
    const estado     = col('U_Estado');
    const expDate    = col('U_FECHAEXPIRACION');
    const idU        = col('U_IdU');
    const login      = col('U_Login');
    const nomUser    = col('U_NomUser')    ?? '';
    const superUser  = col('U_SuperUser')  ?? 0;
    const appRend    = col('U_AppRend')    ?? 'N';
    const appConf    = col('U_AppConf')    ?? 'N';
    const fijarSaldo = col('U_FIJARSALDO') ?? '0';
    const fijarNr    = col('U_FIJARNR')    ?? '0';
    const nr1        = col('U_NR1')        ?? '';
    const nr2        = col('U_NR2')        ?? '';
    const nr3        = col('U_NR3')        ?? '';

    const isValid = await bcrypt.compare(password, pass ?? '');
    this.logger.debug(`bcrypt.compare: ${isValid}`);

    if (!isValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (estado !== '1') {
      throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    }

    if (new Date(expDate) < new Date()) {
      throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');
    }

    this.logger.log(`Login exitoso: ${username}`);

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf, fijarSaldo,
      fijarNr, nr1, nr2, nr3,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: idU, username: login, name: nomUser, role: payload.role, appRend, appConf, fijarSaldo },
    };
  }

  async refreshToken(userId: number) {
    const rows = await this.db.query<any>(
      `SELECT "U_IdU", "U_Login", "U_SuperUser", "U_NomUser",
              "U_Estado", "U_AppRend", "U_AppConf", "U_FIJARSALDO", "U_FECHAEXPIRACION",
              "U_FIJARNR", "U_NR1", "U_NR2", "U_NR3"
       FROM ${this.DB}
       WHERE "U_IdU" = ?`,
      [userId],
    );

    const user = rows[0];
    if (!user) throw new UnauthorizedException('Usuario no valido');

    const col = (name: string) => this.db.col(user, name);

    const estado     = col('U_Estado');
    const expDate    = col('U_FECHAEXPIRACION');
    const idU        = col('U_IdU');
    const login      = col('U_Login');
    const nomUser    = col('U_NomUser')    ?? '';
    const superUser  = col('U_SuperUser')  ?? 0;
    const appRend    = col('U_AppRend')    ?? 'N';
    const appConf    = col('U_AppConf')    ?? 'N';
    const fijarSaldo = col('U_FIJARSALDO') ?? '0';
    const fijarNr    = col('U_FIJARNR')    ?? '0';
    const nr1        = col('U_NR1')        ?? '';
    const nr2        = col('U_NR2')        ?? '';
    const nr3        = col('U_NR3')        ?? '';

    if (estado !== '1') throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    if (new Date(expDate) < new Date()) throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf, fijarSaldo,
      fijarNr, nr1, nr2, nr3,
    };

    return { access_token: this.jwtService.sign(payload) };
  }
}