import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';
import { AuthResponse } from './dto/auth.response.js';
import { JwtAuthGuard } from './guards/jwt.guard.js';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator.js';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Query(() => String)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtPayload): Promise<string> {
    return `Connecté en tant que ${user.username}`;
  }
}