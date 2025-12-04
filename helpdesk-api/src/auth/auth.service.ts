import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate email + password combo.
   * Returns the user without the password hash if valid, otherwise null.
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    // adjust field name if your schema uses something else than passwordHash
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) return null;

    // strip hash before returning
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Issue JWT + return user profile.
   * Shape must match what the frontend lib/api.ts expects.
   */
  async login(user: any) {
    // user is the object returned by validateUser (no hash)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Used by /auth/me
   */
  async getProfile(userId: number | undefined) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
