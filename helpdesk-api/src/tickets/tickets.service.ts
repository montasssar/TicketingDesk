import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  UpdateTicketDto,
  UpdateTicketStatusDto,
} from './dto/update-ticket.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Common include for a “full” ticket.
   */
  private readonly ticketInclude = {
    creator: {
      select: { id: true, email: true, name: true, role: true },
    },
    assignee: {
      select: { id: true, email: true, name: true, role: true },
    },
    comments: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        author: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    },
  };

  /**
   * Basic visibility rules:
   * - admin / agent → can see everything
   * - employee → only tickets they created
   */
  private ensureCanSeeTicket(
    ticketCreatorId: number,
    assigneeId: number | null,
    userId: number,
    role: UserRole,
  ) {
    if (role === 'admin' || role === 'agent') {
      return;
    }

    if (ticketCreatorId !== userId) {
      throw new ForbiddenException('You cannot access this ticket');
    }
  }

  /**
   * Helper used by listTicketsForUser.
   */
  private getTicketListWhere(userId: number, role: UserRole) {
    if (role === 'employee') {
      // Only their own tickets
      return { creatorId: userId };
    }

    if (role === 'agent') {
      // Simple version: all non-closed tickets
      return { status: { not: TicketStatus.CLOSED } };
    }

    // admin → everything
    return {};
  }

  /* =========
   *  CREATE
   * ========= */

  async createTicket(dto: CreateTicketDto, userId: number) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        creatorId: userId,
        assigneeId: dto.assigneeId ?? null,
      },
      include: this.ticketInclude,
    });

    return ticket;
  }

  /* =========
   *  DETAIL
   * ========= */

  async getTicketById(id: number, userId: number, role: UserRole) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    this.ensureCanSeeTicket(ticket.creatorId, ticket.assigneeId, userId, role);

    return ticket;
  }

  /* =========
   *  UPDATE
   * ========= */

  async updateTicket(
    id: number,
    dto: UpdateTicketDto,
    userId: number,
    role: UserRole,
  ) {
    const existing = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Ticket not found');
    }

    this.ensureCanSeeTicket(
      existing.creatorId,
      existing.assigneeId,
      userId,
      role,
    );

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        status: dto.status ?? existing.status,
        priority: dto.priority ?? existing.priority,
        assigneeId:
          dto.assigneeId === undefined
            ? existing.assigneeId
            : dto.assigneeId,
      },
      include: this.ticketInclude,
    });

    return ticket;
  }

  async updateTicketStatus(
    id: number,
    dto: UpdateTicketStatusDto,
    userId: number,
    role: UserRole,
  ) {
    // Delegate to generic update so we keep the same permissions logic
    return this.updateTicket(id, { status: dto.status }, userId, role);
  }

  /* =========
   *  COMMENTS
   * ========= */

  async addComment(ticketId: number, dto: AddCommentDto, userId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.prisma.ticketComment.create({
      data: {
        body: dto.body,
        ticketId,
        authorId: userId,
      },
    });

    const updatedTicket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: this.ticketInclude,
    });

    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found');
    }

    return updatedTicket;
  }

  /* =========
   *  SUMMARY (for dashboard cards)
   * ========= */

  async getSummaryForUser(userId: number, role: UserRole) {
    // “My tickets” depends on role
    let myTicketsWhere: Record<string, any>;

    if (role === 'employee') {
      myTicketsWhere = { creatorId: userId };
    } else if (role === 'agent') {
      myTicketsWhere = { assigneeId: userId };
    } else {
      // admin – keep it simple: tickets they created
      myTicketsWhere = { creatorId: userId };
    }

    const [myTicketsCount, teamQueueCount, totalTicketsCount] =
      await this.prisma.$transaction([
        this.prisma.ticket.count({ where: myTicketsWhere }),
        this.prisma.ticket.count({
          where: {
            assigneeId: null,
            status: { not: TicketStatus.CLOSED },
          },
        }),
        this.prisma.ticket.count(),
      ]);

    return {
      myTicketsCount,
      // Employees shouldn’t see “team queue”
      teamQueueCount: role === 'employee' ? 0 : teamQueueCount,
      totalTicketsCount,
    };
  }

  /* =========
   *  LIST (Tickets page)
   * ========= */

  async listTicketsForUser(userId: number, role: UserRole) {
    const where = this.getTicketListWhere(userId, role);

    const tickets = await this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // Only what the frontend expects for the table
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    return tickets;
  }
}
