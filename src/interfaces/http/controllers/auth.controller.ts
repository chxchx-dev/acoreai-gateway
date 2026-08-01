import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService, JwtPayload, KnowledgeRole, UserRole } from 'src/modules/auth/auth.service';
import { LoginDto } from '../dto/auth/login.dto';
import { LoginOlanDto } from '../dto/auth/login-olan.dto';
import { LoginOlanTokenDto } from '../dto/auth/login-olan-token.dto';
import { CreateUserDto, SetKnowledgeRoleDto } from '../dto/auth/create-user.dto';
import { RefreshTokenDto } from '../dto/auth/refresh-token.dto';
import { ChangePasswordDto } from '../dto/auth/change-password.dto';
import { ForgotPasswordDto } from '../dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '../dto/auth/reset-password.dto';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/login */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(
      dto.email,
      dto.password,
      { deviceId: dto.deviceId, deviceName: dto.deviceName, platform: dto.platform },
      dto.force,
    );
  }

  /** POST /api/auth/login-olan — login con identificación de la plataforma OLAN */
  @Post('login-olan')
  async loginOlan(@Body() dto: LoginOlanDto) {
    return this.authService.loginOlan(
      dto.identificacion,
      dto.password,
      { deviceId: dto.deviceId, deviceName: dto.deviceName, platform: dto.platform },
      dto.force,
    );
  }

  /** POST /api/auth/login-olan-token — login desde redirección externa con token de plataforma OLAN */
  @Post('login-olan-token')
  async loginOlanToken(@Body() dto: LoginOlanTokenDto) {
    return this.authService.loginOlanToken(
      dto.identificacion,
      dto.olanToken,
      { deviceId: dto.deviceId, deviceName: dto.deviceName, platform: dto.platform },
      dto.force,
    );
  }

  /** POST /api/auth/refresh */
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto.refreshToken);
  }

  /** POST /api/auth/logout */
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.revokeRefreshToken(dto.refreshToken);
  }

  /** POST /api/auth/forgot-password — envía un código de recuperación por correo */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /** POST /api/auth/reset-password — valida el código y define la nueva contraseña */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  /** GET /api/auth/me */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return jwtUser(req);
  }

  /** PATCH /api/auth/password — cambia la contraseña del usuario autenticado */
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.authService.changePassword(jwtUser(req).sub, dto.currentPassword, dto.newPassword);
  }

  /** POST /api/auth/users — solo ADMIN */
  @Post('users')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async createUser(@Body() dto: CreateUserDto, @Req() req: Request) {
    if (jwtUser(req).role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden crear usuarios');
    }
    return this.authService.createUser(
      dto.email,
      dto.password,
      dto.name,
      dto.role as UserRole,
      dto.knowledgeRole as KnowledgeRole | undefined,
    );
  }

  /** GET /api/auth/users — solo ADMIN */
  @Get('users')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async listUsers(@Req() req: Request) {
    if (jwtUser(req).role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden listar usuarios');
    }
    return this.authService.listUsers();
  }

  /** PATCH /api/auth/users/:id/knowledge-role — solo ADMIN (SUPER_ADMIN del Centro de Conocimiento) */
  @Patch('users/:id/knowledge-role')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async setKnowledgeRole(@Param('id') id: string, @Body() dto: SetKnowledgeRoleDto, @Req() req: Request) {
    if (jwtUser(req).role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo administradores pueden asignar roles del Centro de Conocimiento');
    }
    return this.authService.setKnowledgeRole(id, dto.knowledgeRole as KnowledgeRole);
  }
}
