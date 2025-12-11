// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';
import { UserRole } from '@prisma/client';

interface SafeUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate email/password. Returns user WITHOUT passwordHash on success, null otherwise.
   */
  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    // NOTE: your schema uses `passwordHash`
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }

    const { passwordHash, ...safe } = user;
    return safe as SafeUser;
  }

  /**
   * Issue JWT and return { token, user } to match the frontend LoginResponse.
   */
  async login(user: SafeUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user,
    };
  }

  /**
   * Profile for /auth/me
   */
  async getProfile(userId: number | undefined | null): Promise<SafeUser> {
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user as SafeUser;
  }
}
