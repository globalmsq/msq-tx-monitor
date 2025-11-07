import { ObjectType, Field, ID } from '@nestjs/graphql';

/**
 * GraphQL Token model
 * Represents an ERC20 token
 */
@ObjectType({ description: 'ERC20 Token information' })
export class TokenModel {
  @Field(() => ID, { description: 'Token contract address' })
  id!: string;

  @Field({ description: 'Token symbol (e.g., MSQ, SUT)' })
  symbol!: string;

  @Field({ description: 'Token full name' })
  name!: string;

  @Field({ description: 'Token decimals' })
  decimals!: string;
}
