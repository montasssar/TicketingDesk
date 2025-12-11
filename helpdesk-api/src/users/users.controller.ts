// src/users/users.controller.ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/agents
   * Used by the frontend to populate the assignment dropdown.
   */
  @Get("agents")
  getAgents() {
    return this.usersService.findAgents();
  }
}
