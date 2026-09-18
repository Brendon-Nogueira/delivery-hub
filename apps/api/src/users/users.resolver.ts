import { Resolver, Query, Args, ObjectType, Field, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';

/**
 * UserType — ObjectType GraphQL para representar um usuário.
 *
 * CONCEITO GRAPHQL (Code-First):
 * Em vez de escrever o schema em SDL (.graphql), usamos decorators TypeScript.
 * O NestJS + Apollo gera o schema automaticamente a partir dessas classes.
 *
 * Vantagem: type-safety entre o schema e o código.
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
  constructor(private readonly usersService: UsersService) {}

  /**
   * Query GraphQL: users
   *
   * CONCEITO: Diferente do REST onde GET /users retorna TODOS os campos,
   * no GraphQL o cliente escolhe exatamente quais campos quer:
   *
   * query {
   *   users {
   *     id
   *     name
   *     role
   *   }
   * }
   *
   * → Retorna APENAS id, name e role (sem email, phone, etc.)
   * → Isso é a solução para o problema de OVER-FETCHING do REST.
   */
  @Query(() => [UserType], { name: 'users', description: 'Lista todos os usuários' })
  async getUsers() {
    return this.usersService.findAll();
  }

  @Query(() => UserType, { name: 'user', nullable: true, description: 'Busca usuário por ID' })
  async getUser(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findById(id);
  }
}
