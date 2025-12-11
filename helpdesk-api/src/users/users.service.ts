// src/users/users.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";

export interface AgentUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return all users that can be assigned tickets.
   * For now we treat only users with role = "agent" as assignable.
   * If you want admins to appear too, change the `where` clause.
   */
  async findAgents(): Promise<AgentUser[]> {
    return this.prisma.user.findMany({
      where: {
        role: "agent",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        email: "asc",
      },
    });
  }
}
