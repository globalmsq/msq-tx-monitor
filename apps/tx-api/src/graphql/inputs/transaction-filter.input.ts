import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Sort order enumeration
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Transaction sort field enumeration
 */
export enum TransactionSortField {
  BLOCK_TIMESTAMP = 'blockTimestamp',
  AMOUNT = 'amount',
  BLOCK_NUMBER = 'blockNumber',
}

// Register enums with GraphQL
registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort order for query results',
});

registerEnumType(TransactionSortField, {
  name: 'TransactionSortField',
  description: 'Fields available for sorting transactions',
});

/**
 * Transaction filter input type
 * Used for filtering and sorting transaction queries
 */
@InputType({ description: 'Filter criteria for transactions' })
export class TransactionFilterInput {
  @Field({ nullable: true, description: 'Filter by token address' })
  @IsOptional()
  @IsString()
  token?: string;

  @Field({ nullable: true, description: 'Filter by sender address' })
  @IsOptional()
  @IsString()
  from?: string;

  @Field({ nullable: true, description: 'Filter by receiver address' })
  @IsOptional()
  @IsString()
  to?: string;

  @Field({ nullable: true, description: 'Filter by minimum timestamp' })
  @IsOptional()
  @IsString()
  blockTimestampGte?: string;

  @Field({ nullable: true, description: 'Filter by maximum timestamp' })
  @IsOptional()
  @IsString()
  blockTimestampLte?: string;

  @Field(() => TransactionSortField, {
    nullable: true,
    defaultValue: TransactionSortField.BLOCK_TIMESTAMP,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(TransactionSortField)
  sortBy?: TransactionSortField;

  @Field(() => SortOrder, {
    nullable: true,
    defaultValue: SortOrder.DESC,
    description: 'Sort order',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
