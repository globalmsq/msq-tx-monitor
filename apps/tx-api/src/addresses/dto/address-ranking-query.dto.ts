import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressRankingQueryDto {
  /**
   * Token symbol (MSQ, SUT, KWT, P2UC)
   */
  @IsOptional()
  @IsString()
  token?: string;

  /**
   * Ranking metric
   * - balance: Sort by current token balance (default)
   * - volume: Sort by total transaction volume in timeRange
   */
  @IsOptional()
  @IsIn(['balance', 'volume'])
  metric?: 'balance' | 'volume' = 'balance';

  /**
   * Time range for volume calculation
   * Format: number + unit (h=hours, d=days)
   * Examples: "1h", "24h", "7d", "30d"
   */
  @IsOptional()
  @IsString()
  timeRange?: string;

  /**
   * Deprecated: Use timeRange instead
   * Number of hours to look back
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720) // Max 30 days
  hours?: number;

  /**
   * Maximum number of results to return
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
