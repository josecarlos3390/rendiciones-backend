import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCuentaCOADto {
  @ApiProperty({
    description: "Código del plan de cuentas",
    example: "1.1.1.01",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  COA_CODE: string;

  @ApiProperty({
    description: "Nombre de la cuenta contable",
    example: "Caja general",
    maxLength: 250,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  COA_NAME: string;

  @ApiPropertyOptional({
    description: "Código de formato contable",
    example: "ACTIVO",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  COA_FORMAT_CODE?: string;

  @ApiPropertyOptional({
    description: "Indica si la cuenta está asociada a empleado",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  COA_ASOCIADA?: string;

  @ApiPropertyOptional({
    description: "Indica si la cuenta está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  COA_ACTIVA?: string;
}

export class UpdateCuentaCOADto {
  @ApiPropertyOptional({
    description: "Nombre de la cuenta contable",
    example: "Caja general",
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  COA_NAME?: string;

  @ApiPropertyOptional({
    description: "Código de formato contable",
    example: "ACTIVO",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  COA_FORMAT_CODE?: string;

  @ApiPropertyOptional({
    description: "Indica si la cuenta está asociada a empleado",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  COA_ASOCIADA?: string;

  @ApiPropertyOptional({
    description: "Indica si la cuenta está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  COA_ACTIVA?: string;
}

export class CreateDimensionDto {
  @ApiProperty({ description: "Código de la dimensión", example: 1 })
  @Type(() => Number)
  @IsInt()
  DIM_CODE: number;

  @ApiProperty({
    description: "Nombre de la dimensión",
    example: "Centro de Costo",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  DIM_NAME: string;

  @ApiPropertyOptional({
    description: "Descripción de la dimensión",
    example: "División administrativa",
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  DIM_DESCRIPCION?: string;

  @ApiPropertyOptional({
    description: "Indica si la dimensión está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  DIM_ACTIVA?: string;
}

export class UpdateDimensionDto {
  @ApiPropertyOptional({
    description: "Nombre de la dimensión",
    example: "Centro de Costo",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  DIM_NAME?: string;

  @ApiPropertyOptional({
    description: "Descripción de la dimensión",
    example: "División administrativa",
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  DIM_DESCRIPCION?: string;

  @ApiPropertyOptional({
    description: "Indica si la dimensión está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  DIM_ACTIVA?: string;
}

export class CreateNormaDto {
  @ApiProperty({
    description: "Código del factor de reparto",
    example: "N1-CC",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  NR_FACTOR_CODE: string;

  @ApiProperty({
    description: "Descripción de la norma",
    example: "Reparto por centro de costo",
    maxLength: 250,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  NR_DESCRIPCION: string;

  @ApiProperty({ description: "Código de la dimensión asociada", example: 1 })
  @Type(() => Number)
  @IsInt()
  NR_DIMENSION: number;

  @ApiPropertyOptional({
    description: "Indica si la norma está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  NR_ACTIVA?: string;
}

export class UpdateNormaDto {
  @ApiPropertyOptional({
    description: "Descripción de la norma",
    example: "Reparto por centro de costo",
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  NR_DESCRIPCION?: string;

  @ApiPropertyOptional({
    description: "Código de la dimensión asociada",
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  NR_DIMENSION?: number;

  @ApiPropertyOptional({
    description: "Indica si la norma está activa",
    enum: ["Y", "N"],
  })
  @IsOptional()
  @IsIn(["Y", "N"])
  NR_ACTIVA?: string;
}
