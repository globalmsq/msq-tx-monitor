import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { TransactionModel } from './transaction.model';

/**
 * Generic pagination wrapper factory
 * Creates paginated response types for any model
 */
export function Paginated<T>(classRef: Type<T>): any {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [classRef], { description: 'List of items' })
    items!: T[];

    @Field(() => Int, { description: 'Total count of items' })
    total!: number;

    @Field(() => Int, { description: 'Number of items per page' })
    limit!: number;

    @Field(() => Int, { description: 'Number of items to skip' })
    skip!: number;

    @Field(() => Boolean, { description: 'Whether there are more items' })
    hasMore!: boolean;
  }
  return PaginatedType;
}

/**
 * Paginated transactions response type
 */
@ObjectType({ description: 'Paginated transaction results' })
export class PaginatedTransactions extends Paginated(TransactionModel) {}
