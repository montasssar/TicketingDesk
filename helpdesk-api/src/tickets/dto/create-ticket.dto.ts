import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(5)
  description: string;

  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigneeId?: number | null;
}
