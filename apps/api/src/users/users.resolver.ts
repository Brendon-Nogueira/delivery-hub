import { Resolver, Query, Args, ObjectType, Field, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@delivery-hub/shared';

/**
 * UserType — ObjectType GraphQL para representar um usuário.
 */
@ObjectType('User')
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field()
  role: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field()
  createdAt: Date;
}

@Resolver(() => UserType)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) { }

  /**
   * Query GraphQL: users
   *Protegido por JWT e restrito a administradores.
   */
  @Query(() => [UserType], { name: 'users', description: 'Lista todos os usuários (apenas ADMIN)' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.ADMIN)
  async getUsers() {
    return this.usersService.findAll();
  }

  /**
   * Query GraphQL: user
   * Protegido por JWT e restrito a administradores.
   */
  @Query(() => UserType, { name: 'user', nullable: true, description: 'Busca usuário por ID (apenas ADMIN)' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.ADMIN)
  async getUser(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findById(id);
  }
}
