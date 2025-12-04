import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  UpdateTicketDto,
  UpdateTicketStatusDto,
} from './dto/update-ticket.dto';
import { AddCommentDto } from './dto/add-comment.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UserRole } from '@prisma/client';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private getUser(req: RequestWithUser): { userId: number; role: UserRole } {
    const user = req.user;
    if (!user || typeof user.sub !== 'number' || !user.role) {
      throw new UnauthorizedException('Invalid authenticated user payload');
    }
    return { userId: user.sub, role: user.role };
  }

  /* =========
   *  SUMMARY
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@Req() req: RequestWithUser) {
    const { userId, role } = this.getUser(req);
    return this.ticketsService.getSummaryForUser(userId, role);
  }

  /* =========
   *  LIST
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Get()
  async listTickets(@Req() req: RequestWithUser) {
    const { userId, role } = this.getUser(req);
    return this.ticketsService.listTicketsForUser(userId, role);
  }

  /* =========
   *  CREATE
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateTicketDto,
    @Req() req: RequestWithUser,
  ) {
    const { userId } = this.getUser(req);
    return this.ticketsService.createTicket(dto, userId);
  }

  /* =========
   *  DETAIL
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = this.getUser(req);
    return this.ticketsService.getTicketById(id, userId, role);
  }

  /* =========
   *  UPDATE (generic)
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = this.getUser(req);
    return this.ticketsService.updateTicket(id, dto, userId, role);
  }

  /* =========
   *  UPDATE STATUS ONLY
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = this.getUser(req);
    return this.ticketsService.updateTicketStatus(id, dto, userId, role);
  }

  /* =========
   *  COMMENTS
   * ========= */

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
    @Req() req: RequestWithUser,
  ) {
    const { userId } = this.getUser(req);
    return this.ticketsService.addComment(id, dto, userId);
  }
}
