import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override getRequest(context: ExecutionContext): Request {
    return this.getGqlRequest(context);
  }

  private getGqlRequest(context: ExecutionContext): Request {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext<{ req: Request }>();
    return req;
  }
}