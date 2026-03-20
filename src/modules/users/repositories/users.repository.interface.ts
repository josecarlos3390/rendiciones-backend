import { RendU } from '../interfaces/rend-u.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto }  from '../dto/update-user.dto';

export interface IUsersRepository {
  findAll(): Promise<RendU[]>;
  findOne(id: number): Promise<RendU | null>;
  findByLogin(login: string): Promise<RendU | null>;
  create(dto: CreateUserDto, hashedPassword: string, nextId: number, expStr: string): Promise<RendU>;
  update(id: number, dto: UpdateUserDto, hashedPassword?: string): Promise<{ affected: number }>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  getPasswordHash(userId: number): Promise<string | null>;
  getNextId(): Promise<number>;
}

export const USERS_REPOSITORY = 'USERS_REPOSITORY';