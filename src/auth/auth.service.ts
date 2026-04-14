import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';
import { AuthResponse } from './dto/auth.response.js';
import { JwtPayload } from './decorators/current-user.decorator.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingEmail = await this.authRepository.findUserByEmail(
      input.email,
    );
    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const existingUsername = await this.authRepository.findUserByUsername(
      input.username,
    );
    if (existingUsername) {
      throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await this.authRepository.createUser({
      email: input.email,
      username: input.username,
      password: hashedPassword,
    });

    const token = this.generateToken(user.id, user.email, user.username);

    return {
      accessToken: token,
      userId: user.id,
      username: user.username,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.authRepository.findUserByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(
      input.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const token = this.generateToken(user.id, user.email, user.username);

    return {
      accessToken: token,
      userId: user.id,
      username: user.username,
    };
  }

  private generateToken(
    id: string,
    email: string,
    username: string,
  ): string {
    const payload: JwtPayload = { sub: id, email, username };
    return this.jwtService.sign(payload);
  }
}