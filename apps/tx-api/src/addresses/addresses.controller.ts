import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { AddressesService } from './addresses.service.js';
import { AddressRankingQueryDto } from './dto/address-ranking-query.dto.js';

@Controller('addresses')
export class AddressesController {
  private readonly logger = new Logger(AddressesController.name);

  constructor(private readonly addressesService: AddressesService) {}

  /**
   * GET /addresses/rankings
   * Get address rankings by balance or volume
   * @param query Query parameters including metric, token, timeRange, limit
   */
  @Get('rankings')
  async getRankings(@Query() query: AddressRankingQueryDto) {
    // Backward compatibility: convert hours to timeRange format if provided
    const effectiveTimeRange = query.timeRange || (query.hours ? `${query.hours}h` : undefined);
    const metric = query.metric || 'balance';

    this.logger.debug(
      `Getting rankings for token: ${query.token || 'all'}, metric: ${metric}, timeRange: ${effectiveTimeRange || '24h'}`
    );

    let data;
    if (metric === 'volume') {
      data = await this.addressesService.getRankingsByVolume(
        query.token,
        effectiveTimeRange,
        query.limit || 50
      );
    } else {
      data = await this.addressesService.getRankings(
        query.token,
        effectiveTimeRange,
        query.limit || 50
      );
    }

    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
      metric,
    };
  }

  /**
   * GET /addresses/whales
   * Get whale addresses (large balance holders)
   * @param timeRange Time range (e.g., "1h", "24h", "7d", "30d")
   * @param hours Deprecated: use timeRange instead
   */
  @Get('whales')
  async getWhales(
    @Query('token') token?: string,
    @Query('timeRange') timeRange?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    const effectiveTimeRange = timeRange || (hours ? `${hours}h` : undefined);

    this.logger.debug(
      `Getting whales for token: ${token || 'all'}, timeRange: ${effectiveTimeRange || '24h'}`
    );
    const data = await this.addressesService.getWhales(
      token,
      effectiveTimeRange,
      parseInt(limit || '20')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /addresses/active-traders
   * Get most active traders by transaction count
   * @param timeRange Time range (e.g., "1h", "24h", "7d", "30d")
   * @param hours Deprecated: use timeRange instead
   */
  @Get('active-traders')
  async getActiveTraders(
    @Query('token') token?: string,
    @Query('timeRange') timeRange?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    const effectiveTimeRange = timeRange || (hours ? `${hours}h` : undefined);

    this.logger.debug(
      `Getting active traders for token: ${token || 'all'}, timeRange: ${effectiveTimeRange || '24h'}`
    );
    const data = await this.addressesService.getActiveTraders(
      token,
      effectiveTimeRange,
      parseInt(limit || '50')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /addresses/suspicious
   * Get suspicious addresses
   * @param timeRange Time range (e.g., "1h", "24h", "7d", "30d")
   * @param hours Deprecated: use timeRange instead
   */
  @Get('suspicious')
  async getSuspicious(
    @Query('token') token?: string,
    @Query('timeRange') timeRange?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    const effectiveTimeRange = timeRange || (hours ? `${hours}h` : undefined);

    this.logger.debug(
      `Getting suspicious addresses for token: ${token || 'all'}`
    );
    const data = await this.addressesService.getSuspicious(
      token,
      effectiveTimeRange,
      parseInt(limit || '20')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
      note: 'Suspicious address detection requires database integration',
    };
  }

  /**
   * GET /addresses/stats/:address
   * Get statistics for a specific address
   * @param timeRange Time range (e.g., "1h", "24h", "7d", "30d")
   * @param hours Deprecated: use timeRange instead
   */
  @Get('stats/:address')
  async getAddressStats(
    @Param('address') address: string,
    @Query('token') token?: string,
    @Query('timeRange') timeRange?: string,
    @Query('hours') hours?: string
  ) {
    const effectiveTimeRange = timeRange || (hours ? `${hours}h` : undefined);

    this.logger.debug(`Getting stats for address: ${address}`);
    const data = await this.addressesService.getAddressStats(
      address,
      token,
      effectiveTimeRange
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /addresses/:address/trends
   * Get time-series trends for an address
   * @param timeRange Time range (e.g., "1h", "24h", "7d", "30d")
   * @param hours Deprecated: use timeRange instead
   */
  @Get(':address/trends')
  async getAddressTrends(
    @Param('address') address: string,
    @Query('token') token?: string,
    @Query('timeRange') timeRange?: string,
    @Query('hours') hours?: string,
    @Query('interval') interval?: string
  ) {
    const effectiveTimeRange = timeRange || (hours ? `${hours}h` : undefined);

    this.logger.debug(`Getting trends for address: ${address}`);
    const data = await this.addressesService.getAddressTrends(
      address,
      token,
      effectiveTimeRange,
      interval || 'hour'
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }
}
