import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SyncRendicionDto {
  @ApiProperty({
    description: "Usuario de SAP Business One",
    example: "manager",
    maxLength: 80,
  })
  @IsString({ message: "El usuario SAP debe ser texto" })
  @IsNotEmpty({ message: "El usuario SAP es obligatorio" })
  @MaxLength(80, { message: "El usuario SAP no puede superar 80 caracteres" })
  sapUser: string;

  @ApiProperty({
    description: "Contraseña de SAP Business One",
    example: "1234",
    maxLength: 200,
  })
  @IsString({ message: "La contraseña SAP debe ser texto" })
  @IsNotEmpty({ message: "La contraseña SAP es obligatoria" })
  @MaxLength(200, {
    message: "La contraseña SAP no puede superar 200 caracteres",
  })
  sapPassword: string;
}
