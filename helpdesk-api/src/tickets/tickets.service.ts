// src/tickets/tickets.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
  };

  private ticketDetailInclude(): any {
    return {
      creator: { select: this.userSelect },
      assignee: { select: this.userSelect },
      comments: {
        include: {
          author: { select: this.userSelect },
        },
      },
    };
  }

  /**
   * LIST FOR CURRENT USER
   * - employee + userId => only their tickets
   * - anything else      => all tickets
   */
  async listForUser(userId: number | null, role: UserRole) {
    const where =
      role === "employee" && userId
        ? { creatorId: userId }
        : {};

    return this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: this.ticketDetailInclude(),
    });
  }

  /* SINGLE TICKET DETAIL */
  async getById(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: this.ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    return ticket;
  }

  /**
   * SUMMARY COUNTS FOR DASHBOARD
   * - employee + userId => stats for their tickets
   * - anything else      => stats for all tickets
   */
  async getSummary(userId: number | null, role: UserRole) {
    const whereBase =
      role === "employee" && userId
        ? { creatorId: userId }
        : {};

    const [total, open, inProgress, resolved, closed] =
      await Promise.all([
        this.prisma.ticket.count({ where: whereBase }),
        this.prisma.ticket.count({
          where: { ...whereBase, status: TicketStatus.OPEN },
        }),
        this.prisma.ticket.count({
          where: {
            ...whereBase,
            status: TicketStatus.IN_PROGRESS,
          },
        }),
        this.prisma.ticket.count({
          where: { ...whereBase, status: TicketStatus.RESOLVED },
        }),
        this.prisma.ticket.count({
          where: { ...whereBase, status: TicketStatus.CLOSED },
        }),
      ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }

  /* CREATE TICKET */
  async create(
    dto: {
      title: string;
      description: string;
      priority?: TicketPriority;
      assigneeId?: number | null;
    },
    creatorId: number,
  ) {
    if (!creatorId) {
      throw new BadRequestException(
        "creatorId is required when creating a ticket",
      );
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: TicketStatus.OPEN,
        priority: dto.priority ?? TicketPriority.MEDIUM,

        // required relation
        creator: {
          connect: { id: creatorId },
        },

        // optional assignee
        assignee: dto.assigneeId
          ? {
              connect: { id: dto.assigneeId },
            }
          : undefined,
      },
      include: this.ticketDetailInclude(),
    });

    return ticket;
  }

  /* ASSIGN / UNASSIGN TICKET */
  async assign(id: number, assigneeId: number | null) {
    const data =
      assigneeId != null
        ? { assignee: { connect: { id: assigneeId } } }
        : { assignee: { disconnect: true } };

    await this.prisma.ticket.update({
      where: { id },
      data,
    });

    return this.getById(id);
  }

  /* STATUS */
  async updateStatus(id: number, status: TicketStatus) {
    await this.prisma.ticket.update({
      where: { id },
      data: { status },
    });

    return this.getById(id);
  }

  /* PRIORITY */
  async updatePriority(id: number, priority: TicketPriority) {
    await this.prisma.ticket.update({
      where: { id },
      data: { priority },
    });

    return this.getById(id);
  }

  /* COMMENTS */
  async addComment(ticketId: number, authorId: number, body: string) {
    if (!authorId) {
      throw new BadRequestException(
        "authorId is required when adding a comment",
      );
    }

    await this.prisma.ticketComment.create({
      data: {
        body,
        ticket: { connect: { id: ticketId } },
        author: { connect: { id: authorId } },
      },
    });

    return this.getById(ticketId);
  }
}
