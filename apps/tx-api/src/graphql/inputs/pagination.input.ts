import { InputType, Field, Int } from '@nestjs/graphql';
import { Min, Max, IsOptional } from 'class-validator';

/**
 * Pagination input type
 * Used for paginating query results
 */
@InputType({ description: 'Pagination parameters' })
export class PaginationInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 100,
    description: 'Number of items to return',
  })
  @IsOptional()
  @Min(1)
  @Max(1000)
  limit?: number;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 0,
    description: 'Number of items to skip',
  })
  @IsOptional()
  @Min(0)
  skip?: number;
}
