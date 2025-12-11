import { IsNumber, IsOptional } from "class-validator";

export class AssignTicketDto {
  @IsOptional()
  @IsNumber()
  assigneeId: number | null;
}
