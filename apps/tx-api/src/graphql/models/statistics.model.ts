import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * Address transaction statistics model
 * Future integration with tx-analyzer service
 */
@ObjectType({ description: 'Address transaction statistics' })
export class AddressStatisticsModel {
  @Field({ description: 'Ethereum address' })
  address!: string;

  @Field(() => Int, { description: 'Total transactions sent' })
  transactionsSent!: number;

  @Field(() => Int, { description: 'Total transactions received' })
  transactionsReceived!: number;

  @Field({ description: 'Total volume sent (in wei)' })
  totalVolumeSent!: string;

  @Field({ description: 'Total volume received (in wei)' })
  totalVolumeReceived!: string;

  @Field({ description: 'First transaction timestamp' })
  firstTransactionAt!: string;

  @Field({ description: 'Last transaction timestamp' })
  lastTransactionAt!: string;
}

/**
 * Token statistics model
 * Future integration with tx-analyzer service
 */
@ObjectType({ description: 'Token statistics' })
export class TokenStatisticsModel {
  @Field({ description: 'Token address' })
  tokenAddress!: string;

  @Field(() => Int, { description: 'Total transfer count' })
  totalTransfers!: number;

  @Field({ description: 'Total volume transferred' })
  totalVolume!: string;

  @Field(() => Int, { description: 'Unique holders count' })
  uniqueHolders!: number;
}
