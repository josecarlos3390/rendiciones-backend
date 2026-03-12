import { PartialType } from '@nestjs/swagger';
import { CreateRendMDto } from './create-rend-m.dto';

export class UpdateRendMDto extends PartialType(CreateRendMDto) {}
