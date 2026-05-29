import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, TokenService, AuthGuard],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
