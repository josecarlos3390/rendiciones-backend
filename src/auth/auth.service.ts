import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../database/interfaces/database.interface';
import { LoginDto }      from './dto/login.dto';
import { JwtPayload }    from './interfaces/jwt-payload.interface';
import { tbl }           from '../database/db-table.helper';
import { LoginAttemptsService } from './services/login-attempts.service';
import * as bcrypt from 'bcryptjs';

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
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  private get schema(): string { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string { return (this.configService.get<string>('app.dbType') ?? 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_U', this.dbType); }

  private toRole(superUser: number): string {
    return superUser === 1 ? 'ADMIN' : 'USER';
  }

  async login(dto: LoginDto) {
    const { password } = dto;
    const username = dto.username.trim().toLowerCase();

    // Verificar si la cuenta está bloqueada por intentos fallidos
    this.loginAttempts.checkLockout(username);

    const rows = await this.db.query<any>(
      `SELECT "U_IdU", "U_Login", "U_Pass", "U_SuperUser", "U_NomUser",
              "U_Estado", "U_AppRend", "U_AppConf", "U_FIJARSALDO", "U_FECHAEXPIRACION",
              "U_FIJARNR", "U_NR1", "U_NR2", "U_NR3", "U_GenDocPre", "U_NomSup"
       FROM ${this.DB}
       WHERE LOWER("U_Login") = ?`,
      [username],
    );

    this.logger.debug(`Login rows para "${username}": ${JSON.stringify(rows)}`);

    const user = rows[0] ?? null;

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${username}`);
      // Registrar intento fallido
      this.loginAttempts.recordFailedAttempt(username);
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
    const appRend    = String(col('U_AppRend')    ?? '0').trim() === '1' ? 'Y' : 'N';
    const appConf    = String(col('U_AppConf')    ?? '0').trim() === '1' ? 'Y' : 'N';
    const fijarSaldo = col('U_FIJARSALDO') ?? '0';
    const genDocPre  = col('U_GenDocPre')  ?? '0';
    const fijarNr    = col('U_FIJARNR')    ?? '0';
    const nr1        = col('U_NR1')        ?? '';
    const nr2        = col('U_NR2')        ?? '';
    const nr3        = col('U_NR3')        ?? '';
    const nomSup     = col('U_NomSup')     ?? '';

    // ¿Es aprobador de algún usuario? → buscar si alguien lo tiene como U_NomSup
    const aprobRows  = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt" FROM ${this.DB} WHERE LOWER("U_NomSup") = ?`,
      [String(login).toLowerCase()],
    );
    const esAprobador = Number(this.db.col(aprobRows[0], 'cnt') ?? 0) > 0;

    const isValid = await bcrypt.compare(password, pass ?? '');
    this.logger.debug(`bcrypt.compare: ${isValid}`);

    if (!isValid) {
      // Registrar intento fallido
      this.loginAttempts.recordFailedAttempt(username);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (estado !== '1') {
      throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    }

    if (new Date(expDate) < new Date()) {
      throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');
    }

    // Login exitoso - limpiar intentos fallidos
    this.loginAttempts.recordSuccessfulLogin(username);
    this.logger.log(`Login exitoso: ${username}`);

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf, fijarSaldo, genDocPre,
      fijarNr, nr1, nr2, nr3, nomSup, esAprobador,
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
              "U_FIJARNR", "U_NR1", "U_NR2", "U_NR3", "U_GenDocPre", "U_NomSup"
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
    const appRend    = String(col('U_AppRend')    ?? '0').trim() === '1' ? 'Y' : 'N';
    const appConf    = String(col('U_AppConf')    ?? '0').trim() === '1' ? 'Y' : 'N';
    const fijarSaldo = col('U_FIJARSALDO') ?? '0';
    const genDocPre  = col('U_GenDocPre')  ?? '0';
    const fijarNr    = col('U_FIJARNR')    ?? '0';
    const nr1        = col('U_NR1')        ?? '';
    const nr2        = col('U_NR2')        ?? '';
    const nr3        = col('U_NR3')        ?? '';
    const nomSup     = col('U_NomSup')     ?? '';

    // ¿Es aprobador de algún usuario?
    const aprobRows2 = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt" FROM ${this.DB} WHERE LOWER("U_NomSup") = ?`,
      [String(login).toLowerCase()],
    );
    const esAprobador = Number(this.db.col(aprobRows2[0], 'cnt') ?? 0) > 0;

    if (estado !== '1') throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    if (new Date(expDate) < new Date()) throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf, fijarSaldo, genDocPre,
      fijarNr, nr1, nr2, nr3, nomSup, esAprobador,
    };

    return { access_token: this.jwtService.sign(payload) };
  }
}
