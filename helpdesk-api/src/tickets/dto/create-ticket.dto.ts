import { IsEnum, IsOptional, IsString, MinLength, IsNumber } from "class-validator";
import { TicketPriority } from "@prisma/client";

export class CreateTicketDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsNumber()
  assigneeId?: number | null;
}
