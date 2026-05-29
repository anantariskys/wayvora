import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';
import type { AuthUser, StoredUser } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  register(dto: RegisterDto) {
    this.assertRegisterDto(dto);
    const user = this.authRepository.create({
      email: dto.email,
      fullName: dto.fullName.trim(),
      passwordHash: this.hashPassword(dto.password),
    });
    const token = this.tokenService.sign(this.toPublicUser(user));
    const refreshToken = this.issueRefreshToken(user.id);

    return {
      user: this.toPublicUser(user),
      ...token,
      refreshToken: refreshToken.token,
    };
  }

  login(dto: LoginDto) {
    const user = this.authRepository.findByEmail(dto.email ?? '');

    if (!user || !this.verifyPassword(dto.password ?? '', user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      user: this.toPublicUser(user),
      ...this.tokenService.sign(this.toPublicUser(user)),
      refreshToken: this.issueRefreshToken(user.id).token,
    };
  }

  refresh(dto: RefreshTokenDto) {
    const token = dto.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const record = this.authRepository.findRefreshToken(
      this.hashRefreshToken(token),
    );

    if (!record) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (record.revokedAt) {
      this.authRepository.revokeRefreshTokenFamily(record.familyId);
      throw new ForbiddenException('Refresh token reuse detected.');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      this.authRepository.revokeRefreshToken(record.id);
      throw new UnauthorizedException('Refresh token expired.');
    }

    const user = this.authRepository.findById(record.userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    this.authRepository.revokeRefreshToken(record.id);
    const nextRefreshToken = this.issueRefreshToken(user.id, record.familyId);

    return {
      ...this.tokenService.sign(this.toPublicUser(user)),
      refreshToken: nextRefreshToken.token,
    };
  }

  logout(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      return { revoked: false };
    }

    const record = this.authRepository.findRefreshToken(
      this.hashRefreshToken(dto.refreshToken),
    );

    if (record) {
      this.authRepository.revokeRefreshToken(record.id);
    }

    return { revoked: Boolean(record) };
  }

  verifyToken(token: string): AuthUser {
    const payload = this.tokenService.verify(token);
    const user = this.authRepository.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return this.toPublicUser(user);
  }

  private assertRegisterDto(dto: RegisterDto): void {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email is required.');
    }

    if (!dto.fullName || dto.fullName.trim().length < 2) {
      throw new BadRequestException('Full name must be at least 2 characters.');
    }

    if (!dto.password || dto.password.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters.');
    }
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('base64url');
    const hash = pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString(
      'base64url',
    );

    return `pbkdf2_sha256$120000$${salt}$${hash}`;
  }

  private verifyPassword(password: string, encodedHash: string): boolean {
    const [algorithm, iterations, salt, hash] = encodedHash.split('$');

    if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !hash) {
      return false;
    }

    const candidate = pbkdf2Sync(
      password,
      salt,
      Number(iterations),
      32,
      'sha256',
    ).toString('base64url');

    return candidate === hash;
  }

  private issueRefreshToken(userId: string, familyId: string = randomUUID()) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    this.authRepository.createRefreshToken({
      userId,
      tokenHash: this.hashRefreshToken(token),
      familyId,
      expiresAt,
    });

    return { token, expiresAt };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(`refresh:${token}`).digest('hex');
  }

  private toPublicUser(user: StoredUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
