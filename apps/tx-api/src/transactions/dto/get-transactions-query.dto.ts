import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum TransferOrderBy {
  BLOCK_TIMESTAMP = 'blockTimestamp',
  AMOUNT = 'amount',
  BLOCK_NUMBER = 'blockNumber',
}

export class GetTransactionsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsEnum(TransferOrderBy)
  orderBy?: TransferOrderBy = TransferOrderBy.BLOCK_TIMESTAMP;

  @IsOptional()
  @IsEnum(OrderDirection)
  orderDirection?: OrderDirection = OrderDirection.DESC;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  blockTimestamp_gte?: string;

  @IsOptional()
  @IsString()
  blockTimestamp_lte?: string;
}
