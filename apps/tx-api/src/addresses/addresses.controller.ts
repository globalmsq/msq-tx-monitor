import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { AddressesService } from './addresses.service.js';

@Controller('addresses')
export class AddressesController {
  private readonly logger = new Logger(AddressesController.name);

  constructor(private readonly addressesService: AddressesService) {}

  /**
   * GET /addresses/rankings
   * Get address rankings by total volume
   */
  @Get('rankings')
  async getRankings(
    @Query('token') token?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(
      `Getting rankings for token: ${token || 'all'}, hours: ${hours || '24'}`
    );
    const data = await this.addressesService.getRankings(
      token,
      parseInt(hours || '24'),
      parseInt(limit || '50')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /addresses/whales
   * Get whale addresses (large balance holders)
   */
  @Get('whales')
  async getWhales(
    @Query('token') token?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(
      `Getting whales for token: ${token || 'all'}, hours: ${hours || '24'}`
    );
    const data = await this.addressesService.getWhales(
      token,
      parseInt(hours || '24'),
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
   */
  @Get('active-traders')
  async getActiveTraders(
    @Query('token') token?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(
      `Getting active traders for token: ${token || 'all'}, hours: ${hours || '24'}`
    );
    const data = await this.addressesService.getActiveTraders(
      token,
      parseInt(hours || '24'),
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
   */
  @Get('suspicious')
  async getSuspicious(
    @Query('token') token?: string,
    @Query('hours') hours?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(
      `Getting suspicious addresses for token: ${token || 'all'}`
    );
    const data = await this.addressesService.getSuspicious(
      token,
      parseInt(hours || '24'),
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
   */
  @Get('stats/:address')
  async getAddressStats(
    @Param('address') address: string,
    @Query('token') token?: string,
    @Query('hours') hours?: string
  ) {
    this.logger.debug(`Getting stats for address: ${address}`);
    const data = await this.addressesService.getAddressStats(
      address,
      token,
      parseInt(hours || '24')
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
   */
  @Get(':address/trends')
  async getAddressTrends(
    @Param('address') address: string,
    @Query('token') token?: string,
    @Query('hours') hours?: string,
    @Query('interval') interval?: string
  ) {
    this.logger.debug(`Getting trends for address: ${address}`);
    const data = await this.addressesService.getAddressTrends(
      address,
      token,
      parseInt(hours || '24'),
      interval || 'hour'
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }
}
