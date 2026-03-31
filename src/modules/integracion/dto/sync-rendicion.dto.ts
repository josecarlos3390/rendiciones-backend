import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SyncRendicionDto {
  @IsString({ message: 'El usuario SAP debe ser texto' })
  @IsNotEmpty({ message: 'El usuario SAP es obligatorio' })
  @MaxLength(80, { message: 'El usuario SAP no puede superar 80 caracteres' })
  sapUser: string;

  @IsString({ message: 'La contraseña SAP debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña SAP es obligatoria' })
  @MaxLength(200, { message: 'La contraseña SAP no puede superar 200 caracteres' })
  sapPassword: string;
}