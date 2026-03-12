import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../database/hana.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly DUMMY_HASH =
    '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';

  constructor(
    private readonly hanaService:   HanaService,
    private readonly jwtService:    JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get DB(): string {
    return `"${this.schema}"."REND_U"`;
  }

  private toRole(superUser: number): string {
    return superUser === 1 ? 'ADMIN' : 'USER';
  }

  async login(dto: LoginDto) {
    const { username, password } = dto;

    const rows = await this.hanaService.query<any>(
      `SELECT "U_IdU", "U_Login", "U_Pass", "U_SuperUser", "U_NomUser",
              "U_Estado", "U_AppRend", "U_AppConf", "U_FECHAEXPIRACION"
       FROM ${this.DB}
       WHERE "U_Login" = ?`,
      [username],
    );

    this.logger.debug(`Login rows para "${username}": ${JSON.stringify(rows)}`);

    const user = rows[0] ?? null;

    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${username}`);
      await bcrypt.compare(password, this.DUMMY_HASH);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const col = HanaService.col.bind(null, user);

    const pass      = col('U_Pass');
    const estado    = col('U_Estado');
    const expDate   = col('U_FECHAEXPIRACION');
    const idU       = col('U_IdU');
    const login     = col('U_Login');
    const nomUser   = col('U_NomUser')   ?? '';
    const superUser = col('U_SuperUser') ?? 0;
    const appRend   = col('U_AppRend')   ?? 'N';
    const appConf   = col('U_AppConf')   ?? 'N';

    this.logger.debug(`hash encontrado: ${pass}`);

    const isValid = await bcrypt.compare(password, pass ?? '');
    this.logger.debug(`bcrypt.compare: ${isValid}`);

    if (!isValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (estado !== 'A') {
      throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    }

    if (new Date(expDate) < new Date()) {
      throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');
    }

    this.logger.log(`Login exitoso: ${username}`);

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: idU, username: login, name: nomUser, role: payload.role, appRend, appConf },
    };
  }

  async refreshToken(userId: number) {
    const rows = await this.hanaService.query<any>(
      `SELECT "U_IdU", "U_Login", "U_SuperUser", "U_NomUser",
              "U_Estado", "U_AppRend", "U_AppConf", "U_FECHAEXPIRACION"
       FROM ${this.DB}
       WHERE "U_IdU" = ?`,
      [userId],
    );

    const user = rows[0];
    if (!user) throw new UnauthorizedException('Usuario no valido');

    const col = HanaService.col.bind(null, user);

    const estado    = col('U_Estado');
    const expDate   = col('U_FECHAEXPIRACION');
    const idU       = col('U_IdU');
    const login     = col('U_Login');
    const nomUser   = col('U_NomUser')   ?? '';
    const superUser = col('U_SuperUser') ?? 0;
    const appRend   = col('U_AppRend')   ?? 'N';
    const appConf   = col('U_AppConf')   ?? 'N';

    if (estado !== 'A') throw new UnauthorizedException('Tu cuenta esta inactiva. Contacta al administrador.');
    if (new Date(expDate) < new Date()) throw new UnauthorizedException('Tu cuenta ha expirado. Contacta al administrador.');

    const payload: JwtPayload = {
      sub: idU, username: login, name: nomUser,
      role: this.toRole(superUser), appRend, appConf,
    };

    return { access_token: this.jwtService.sign(payload) };
  }
}