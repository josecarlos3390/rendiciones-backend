import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePermisoDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  idUsuario: number;

  @ApiProperty({ description: 'ID del perfil a asignar' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  idPerfil: number;
}
