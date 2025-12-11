import { IsEnum, IsOptional } from "class-validator";
import { TicketStatus, TicketPriority } from "@prisma/client";

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
