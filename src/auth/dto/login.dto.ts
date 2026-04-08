import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'jperez', description: 'U_Login de REND_U (max 10 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 100 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
