// src/tickets/tickets.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FindTicketsDto } from "./dto/find-tickets.dto";
import {
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) { }

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
  async listForUser(
    userId: number | null,
    role: UserRole,
    params: FindTicketsDto,
  ) {
    const { page = 1, limit = 10, status, priority, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based filter
    if (role === 'employee' && userId) {
      where.creatorId = userId;
    }

    // Status & Priority filters
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: this.ticketDetailInclude(),
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
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
    // 1. Total Tickets (Admin uses this, usually)
    const totalTicketsCount = await this.prisma.ticket.count();

    // 2. My Tickets
    //    - Employee: Created by me
    //    - Agent: Assigned to me
    let myTicketsCount = 0;
    if (userId) {
      if (role === 'agent' || role === 'admin') {
        myTicketsCount = await this.prisma.ticket.count({
          where: { assigneeId: userId }
        });
      } else {
        myTicketsCount = await this.prisma.ticket.count({
          where: { creatorId: userId }
        });
      }
    }

    // 3. Team Queue
    //    - For Agents: Unassigned OPEN tickets
    let teamQueueCount = 0;
    if (role === 'agent' || role === 'admin') {
      teamQueueCount = await this.prisma.ticket.count({
        where: { assigneeId: null, status: 'OPEN' }
      });
    }

    // Return the shape expected by DashboardPage
    const summary: any = {
      totalTicketsCount,
      myTicketsCount,
      teamQueueCount,
      // Keep old fields for backward compat if needed, or remove them if api.ts is updated
      total: totalTicketsCount,
    };

    return summary;
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

  /* HISTORY */
  async getHistory(ticketId: number) {
    return this.prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: {
        changer: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  /* ASSIGN */
  async assign(ticketId: number, assigneeId: number | null, userId: number) {
    // Check previous assignee
    const current = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { assigneeId: true, status: true },
    });

    if (!current) {
      throw new BadRequestException("Ticket not found");
    }

    // If no change, return
    if (current.assigneeId === assigneeId) {
      return this.getById(ticketId);
    }

    const [ticket] = await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assigneeId,
          // Auto-update status to IN_PROGRESS if it was OPEN
          status: current.status === 'OPEN' ? 'IN_PROGRESS' : undefined
        },
        include: this.ticketDetailInclude(),
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          changerId: userId,
          field: "assignee",
          oldValue: current.assigneeId?.toString() ?? null,
          newValue: assigneeId?.toString() ?? null,
        },
      }),
    ]);

    // If status changed, we should probably log that too?
    // For simplicity, we'll let the assignee log suffice, or we can add a second history entry.
    // Ideally, we check if status changed and add another history entry.
    if (current.status === 'OPEN') {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId,
          changerId: userId,
          field: "status",
          oldValue: "OPEN",
          newValue: "IN_PROGRESS"
        }
      });
    }

    return ticket;
  }

  /* STATUS */
  async updateStatus(ticketId: number, status: TicketStatus, userId: number) {
    // 1. Get current status for history
    const current = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true },
    });

    if (!current) {
      throw new BadRequestException("Ticket not found");
    }

    if (current.status === status) {
      return this.getById(ticketId);
    }

    // 2. Transaction: Update + Log
    const [ticket] = await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status },
        include: this.ticketDetailInclude(),
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          changerId: userId,
          field: "status",
          oldValue: current.status,
          newValue: status,
        },
      }),
    ]);

    return ticket;
  }

  /* PRIORITY */
  async updatePriority(
    ticketId: number,
    priority: TicketPriority,
    userId: number,
  ) {
    const current = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { priority: true },
    });

    if (!current) {
      throw new BadRequestException("Ticket not found");
    }

    if (current.priority === priority) {
      return this.getById(ticketId);
    }

    const [ticket] = await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { priority },
        include: this.ticketDetailInclude(),
      }),
      this.prisma.ticketHistory.create({
        data: {
          ticketId,
          changerId: userId,
          field: "priority",
          oldValue: current.priority,
          newValue: priority,
        },
      }),
    ]);

    return ticket;
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
