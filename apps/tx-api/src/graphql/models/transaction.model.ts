import { ObjectType, Field, ID } from '@nestjs/graphql';
import { TokenModel } from './token.model.js';

/**
 * GraphQL Transaction model
 * Represents a blockchain transfer event
 */
@ObjectType({ description: 'Blockchain transaction transfer event' })
export class TransactionModel {
  @Field(() => ID, { description: 'Unique transaction identifier' })
  id!: string;

  @Field(() => TokenModel, {
    description: 'Token being transferred',
    complexity: 5,
  })
  token!: TokenModel;

  @Field({ description: 'Sender address' })
  from!: string;

  @Field({ description: 'Receiver address' })
  to!: string;

  @Field({ description: 'Transfer amount in wei' })
  amount!: string;

  @Field({ description: 'Whether this is a mint operation' })
  isMint!: boolean;

  @Field({ description: 'Whether this is a burn operation' })
  isBurn!: boolean;

  @Field({ description: 'Block number where transaction occurred' })
  blockNumber!: string;

  @Field({ description: 'Unix timestamp of the block' })
  blockTimestamp!: string;

  @Field({ description: 'Transaction hash on blockchain' })
  transactionHash!: string;

  @Field({ description: 'Log index within the transaction' })
  logIndex!: string;
}
