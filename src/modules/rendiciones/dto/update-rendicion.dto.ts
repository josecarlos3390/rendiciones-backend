import { PartialType } from '@nestjs/swagger';
import { CreateRendicionDto } from './create-rendicion.dto';

export class UpdateRendicionDto extends PartialType(CreateRendicionDto) {}
