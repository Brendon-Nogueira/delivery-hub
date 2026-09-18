import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  /**
   * Registra um novo usuário.
   *
   * CONCEITO REST: POST /api/v1/auth/register
   * - Status 201: Usuário criado com sucesso
   * - Status 409: Email já existe (ConflictException)
   */
  async register(dto: RegisterDto) {

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Hash da senha com bcrypt (salt rounds = 10)
    const passwordHash = await bcrypt.hash(dto.password, 10);


    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
      },
    });

    // Gerar JWT
    const token = this.generateToken(user.id, user.email, user.role);

    this.logger.log(`✅ Novo usuário registrado: ${user.email} (${user.role})`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  /**
   * Autentica um usuário existente.
   *
   * CONCEITO REST: POST /api/v1/auth/login
   * - Status 200: Login bem-sucedido
   * - Status 401: Credenciais inválidas (UnauthorizedException)
   */
  async login(dto: LoginDto) {

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Comparar senha com hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gerar JWT
    const token = this.generateToken(user.id, user.email, user.role);

    this.logger.log(`🔐 Login: ${user.email}`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  /**
   * Gera um JWT com payload contendo userId, email e role.
   * O token expira conforme JWT_EXPIRATION no .env (padrão: 15min).
   */
  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
