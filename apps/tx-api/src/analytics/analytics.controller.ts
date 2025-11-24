import { Controller, Get, Query, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/realtime
   * Get realtime statistics
   */
  @Get('realtime')
  async getRealtimeStats(@Query('token') token?: string) {
    this.logger.debug(`Getting realtime stats for token: ${token || 'all'}`);
    const data = await this.analyticsService.getRealtimeStats(token);
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/volume/minutes
   * Note: Subgraph only provides hourly data, returning hourly instead
   */
  @Get('volume/minutes')
  async getVolumeMinutes(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug('Minutes not supported, returning hourly data');
    const data = await this.analyticsService.getVolumeHourly(
      token,
      parseInt(limit || '60')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
      note: 'Minute-level data not available, showing hourly data',
    };
  }

  /**
   * GET /analytics/volume/hourly
   * Get hourly volume statistics
   */
  @Get('volume/hourly')
  async getVolumeHourly(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting hourly volume for token: ${token || 'all'}`);
    const data = await this.analyticsService.getVolumeHourly(
      token,
      parseInt(limit || '24')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/volume/daily
   * Get daily volume statistics
   */
  @Get('volume/daily')
  async getVolumeDaily(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting daily volume for token: ${token || 'all'}`);
    const data = await this.analyticsService.getVolumeDaily(
      token,
      parseInt(limit || '30')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/volume/weekly
   * Get weekly volume statistics
   */
  @Get('volume/weekly')
  async getVolumeWeekly(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting weekly volume for token: ${token || 'all'}`);
    const data = await this.analyticsService.getVolumeWeekly(
      token,
      parseInt(limit || '12')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/distribution/token
   * Get token holder distribution
   */
  @Get('distribution/token')
  async getTokenDistribution(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting token distribution for: ${token || 'MSQ'}`);
    const data = await this.analyticsService.getTokenDistribution(
      token || 'MSQ',
      parseInt(limit || '100')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/addresses/top
   * Get top addresses by activity
   */
  @Get('addresses/top')
  async getTopAddresses(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting top addresses for token: ${token || 'all'}`);
    const data = await this.analyticsService.getTopAddresses(
      token,
      parseInt(limit || '50')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/addresses/senders
   * Get top senders
   */
  @Get('addresses/senders')
  async getTopSenders(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting top senders for token: ${token || 'all'}`);
    const data = await this.analyticsService.getTopSenders(
      token,
      parseInt(limit || '50')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/addresses/receivers
   * Get top receivers
   */
  @Get('addresses/receivers')
  async getTopReceivers(
    @Query('token') token?: string,
    @Query('limit') limit?: string
  ) {
    this.logger.debug(`Getting top receivers for token: ${token || 'all'}`);
    const data = await this.analyticsService.getTopReceivers(
      token,
      parseInt(limit || '50')
    );
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/network
   * Get network-wide statistics
   */
  @Get('network')
  async getNetworkStats() {
    this.logger.debug('Getting network statistics');
    const data = await this.analyticsService.getNetworkStats();
    return {
      data,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/anomalies
   * Placeholder - requires database integration
   */
  @Get('anomalies')
  async getAnomalies() {
    const data = await this.analyticsService.getAnomalyStats();
    return {
      data: [],
      message: data.message,
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/anomalies/timeseries/minutes
   * Placeholder - requires database integration
   */
  @Get('anomalies/timeseries/minutes')
  async getAnomalyTimeseriesMinutes() {
    return {
      data: [],
      message: 'Anomaly timeseries not available via Subgraph',
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/anomalies/timeseries/hourly
   * Placeholder - requires database integration
   */
  @Get('anomalies/timeseries/hourly')
  async getAnomalyTimeseriesHourly() {
    return {
      data: [],
      message: 'Anomaly timeseries not available via Subgraph',
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/anomalies/timeseries/daily
   * Placeholder - requires database integration
   */
  @Get('anomalies/timeseries/daily')
  async getAnomalyTimeseriesDaily() {
    return {
      data: [],
      message: 'Anomaly timeseries not available via Subgraph',
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * GET /analytics/anomalies/timeseries/weekly
   * Placeholder - requires database integration
   */
  @Get('anomalies/timeseries/weekly')
  async getAnomalyTimeseriesWeekly() {
    return {
      data: [],
      message: 'Anomaly timeseries not available via Subgraph',
      timestamp: new Date().toISOString(),
      cached: false,
    };
  }
}
