import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthUser } from './types/auth.types';

type TokenPayload = AuthUser & {
  exp: number;
};

@Injectable()
export class TokenService {
  private readonly secret =
    process.env.JWT_ACCESS_SECRET ?? 'wayvora-dev-access-secret';
  private readonly expiresInSeconds = 15 * 60;

  sign(user: AuthUser): { accessToken: string; expiresIn: number } {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload: TokenPayload = {
      ...user,
      exp: Math.floor(Date.now() / 1000) + this.expiresInSeconds,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signBody(`${header}.${body}`);

    return {
      accessToken: `${header}.${body}.${signature}`,
      expiresIn: this.expiresInSeconds,
    };
  }

  verify(token: string): AuthUser {
    const [header, body, signature] = token.split('.');

    if (
      !header ||
      !body ||
      !signature ||
      !this.isValidSignature(`${header}.${body}`, signature)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as TokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Access token expired.');
    }

    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  }

  private signBody(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private isValidSignature(value: string, signature: string): boolean {
    const expected = this.signBody(value);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    return (
      expectedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(expectedBuffer, signatureBuffer)
    );
  }
}
