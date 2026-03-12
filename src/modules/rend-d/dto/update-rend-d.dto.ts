import { PartialType } from '@nestjs/swagger';
import { CreateRendDDto } from './create-rend-d.dto';

export class UpdateRendDDto extends PartialType(CreateRendDDto) {}
