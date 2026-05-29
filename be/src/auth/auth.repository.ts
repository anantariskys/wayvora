import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app-exception';
import type { StoredUser } from './types/auth.types';

type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class AuthRepository {
  private readonly users = new Map<string, StoredUser>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  findByEmail(email: string): StoredUser | null {
    return (
      [...this.users.values()].find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }

  findById(id: string): StoredUser | null {
    return this.users.get(id) ?? null;
  }

  create(input: {
    email: string;
    fullName: string;
    passwordHash: string;
  }): StoredUser {
    if (this.findByEmail(input.email)) {
      throw new AppException(
        'EMAIL_ALREADY_REGISTERED',
        'Email is already registered.',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      role: 'user',
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    return user;
  }

  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): RefreshTokenRecord {
    const record: RefreshTokenRecord = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };

    this.refreshTokens.set(record.id, record);
    return record;
  }

  findRefreshToken(tokenHash: string): RefreshTokenRecord | null {
    return (
      [...this.refreshTokens.values()].find(
        (record) => record.tokenHash === tokenHash,
      ) ?? null
    );
  }

  revokeRefreshToken(recordId: string): void {
    const record = this.refreshTokens.get(recordId);

    if (record) {
      record.revokedAt = new Date();
    }
  }

  revokeRefreshTokenFamily(familyId: string): void {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.revokedAt = new Date();
      }
    }
  }
}
