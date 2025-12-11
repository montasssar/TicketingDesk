// src/tickets/tickets.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import {
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";

import { TicketsService } from "./tickets.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

/* DTOs kept inline & light */

interface CreateTicketDto {
  title: string;
  description: string;
  priority?: TicketPriority;
  assigneeId?: number | null;
}

interface UpdateTicketDto {
  status?: TicketStatus;
  priority?: TicketPriority;
}

interface AddCommentDto {
  body: string;
}

interface AssignTicketDto {
  assigneeId: number | null;
}

@UseGuards(JwtAuthGuard)
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Extract user info from the request.
   * Be tolerant to different JWT payload shapes:
   *  - id, userId, or sub
   *  - role may be missing -> default to "employee"
   *
   * If opts.requireId is true, we throw when we can't find a valid id.
   * Otherwise we allow userId to be null (used for read-only endpoints).
   */
  private extractUser(
    req: any,
    opts?: { requireId?: boolean },
  ): { userId: number | null; role: UserRole } {
    const rawUser = req?.user ?? {};

    const rawId =
      rawUser.id ??
      rawUser.userId ??
      rawUser.sub; // typical Nest JWT payload

    const parsedId =
      rawId !== undefined && rawId !== null
        ? Number(rawId)
        : NaN;

    const hasValidId =
      !Number.isNaN(parsedId) && parsedId > 0;

    if (opts?.requireId && !hasValidId) {
      throw new BadRequestException("Missing authenticated user id");
    }

    const role =
      (rawUser.role as UserRole | undefined) ?? ("employee" as UserRole);

    return {
      userId: hasValidId ? parsedId : null,
      role,
    };
  }

  /* LIST */
  @Get()
  list(@Req() req: any) {
    const { userId, role } = this.extractUser(req, {
      requireId: false,
    });
    return this.ticketsService.listForUser(userId, role);
  }

  /* SUMMARY (for dashboard cards) */
  @Get("summary")
  summary(@Req() req: any) {
    const { userId, role } = this.extractUser(req, {
      requireId: false,
    });
    return this.ticketsService.getSummary(userId, role);
  }

  /* DETAIL */
  @Get(":id")
  getOne(@Param("id") id: string) {
    const ticketId = Number(id);
    if (!ticketId) {
      throw new BadRequestException("Invalid ticket id");
    }
    return this.ticketsService.getById(ticketId);
  }

  /* CREATE */
  @Post()
  create(@Req() req: any, @Body() dto: CreateTicketDto) {
    if (!dto.title || !dto.description) {
      throw new BadRequestException(
        "title and description are required",
      );
    }

    const { userId } = this.extractUser(req, { requireId: true });
    // userId is guaranteed non-null here
    return this.ticketsService.create(dto, userId as number);
  }

  /* ASSIGN / UNASSIGN */
  @Patch(":id/assign")
  assign(@Param("id") id: string, @Body() dto: AssignTicketDto) {
    if (dto.assigneeId === undefined) {
      throw new BadRequestException("assigneeId is required");
    }

    const ticketId = Number(id);
    if (!ticketId) {
      throw new BadRequestException("Invalid ticket id");
    }

    return this.ticketsService.assign(ticketId, dto.assigneeId);
  }

  /* STATUS */
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateTicketDto) {
    if (!dto.status) {
      throw new BadRequestException("status is required");
    }

    const ticketId = Number(id);
    if (!ticketId) {
      throw new BadRequestException("Invalid ticket id");
    }

    return this.ticketsService.updateStatus(ticketId, dto.status);
  }

  /* PRIORITY */
  @Patch(":id/priority")
  updatePriority(@Param("id") id: string, @Body() dto: UpdateTicketDto) {
    if (!dto.priority) {
      throw new BadRequestException("priority is required");
    }

    const ticketId = Number(id);
    if (!ticketId) {
      throw new BadRequestException("Invalid ticket id");
    }

    return this.ticketsService.updatePriority(ticketId, dto.priority);
  }

  /* COMMENTS */
  @Post(":id/comments")
  addComment(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: AddCommentDto,
  ) {
    if (!dto.body) {
      throw new BadRequestException("body is required");
    }

    const { userId } = this.extractUser(req, { requireId: true });

    const ticketId = Number(id);
    if (!ticketId) {
      throw new BadRequestException("Invalid ticket id");
    }

    return this.ticketsService.addComment(
      ticketId,
      userId as number,
      dto.body,
    );
  }
}
