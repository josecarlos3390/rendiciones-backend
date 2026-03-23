import { PartialType } from '@nestjs/swagger';
import { CreateRendCmpDto } from './create-rend-cmp.dto';

export class UpdateRendCmpDto extends PartialType(CreateRendCmpDto) {}