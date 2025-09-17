import { Pool, RowDataPacket } from 'mysql2/promise';
import { AddressRanking, AddressSearch, AddressRankingFilters, TopAddressesResponse } from '../types/address.types';
import { RedisConnection } from '../cache/redis';

export class AddressService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Get top addresses by volume or frequency
   */
  async getTopAddresses(
    filters: AddressRankingFilters = {},
    limit: number = 50
  ): Promise<TopAddressesResponse> {
    const cacheKey = `top_addresses:${JSON.stringify({ filters, limit })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for top addresses:', error);
    }

    // Build time period filter
    const { start_date, end_date } = this.getTimePeriod(filters.time_period || 'all');

    // Build WHERE clause
    const { whereClause, params } = this.buildAddressWhereClause(filters, start_date, end_date);

    const query = `
      SELECT
        COALESCE(from_address, to_address) as address,
        SUM(CAST(amount AS DECIMAL(65,0))) as total_volume,
        COUNT(*) as transaction_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM (
        SELECT from_address as address, amount, timestamp ${filters.token ? ', token_symbol' : ''}
        FROM transactions
        ${whereClause}
        UNION ALL
        SELECT to_address as address, amount, timestamp ${filters.token ? ', token_symbol' : ''}
        FROM transactions
        ${whereClause}
      ) as combined_transactions
      WHERE address IS NOT NULL
      GROUP BY address
      HAVING total_volume > ${filters.min_volume || '0'}
        AND transaction_count >= ${filters.min_transactions || 1}
      ORDER BY total_volume DESC
      LIMIT ?
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(query, [...params, ...params, limit]);

    const rankings = rows.map((row, index) => ({
      address: row.address,
      total_volume: row.total_volume.toString(),
      transaction_count: row.transaction_count,
      first_seen: new Date(row.first_seen),
      last_seen: new Date(row.last_seen),
      rank: index + 1
    })) as AddressRanking[];

    const response: TopAddressesResponse = {
      data: rankings,
      filters,
      period: {
        start_date,
        end_date
      },
      timestamp: new Date()
    };

    // Cache the response for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 300);
    } catch (error) {
      console.warn('Failed to cache top addresses:', error);
    }

    return response;
  }

  /**
   * Search addresses with autocomplete functionality
   */
  async searchAddresses(query: string, limit: number = 10): Promise<AddressSearch[]> {
    const cacheKey = `address_search:${query}:${limit}`;

    // Try cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for address search:', error);
    }

    // Search for addresses that start with the query
    const searchQuery = `
      SELECT
        address,
        SUM(total_volume) as total_volume,
        SUM(transaction_count) as transaction_count,
        MAX(last_activity) as last_activity
      FROM (
        SELECT
          from_address as address,
          SUM(CAST(amount AS DECIMAL(65,0))) as total_volume,
          COUNT(*) as transaction_count,
          MAX(timestamp) as last_activity
        FROM transactions
        WHERE from_address LIKE ?
        GROUP BY from_address

        UNION ALL

        SELECT
          to_address as address,
          SUM(CAST(amount AS DECIMAL(65,0))) as total_volume,
          COUNT(*) as transaction_count,
          MAX(timestamp) as last_activity
        FROM transactions
        WHERE to_address LIKE ?
        GROUP BY to_address
      ) as combined_addresses
      WHERE address IS NOT NULL
      GROUP BY address
      ORDER BY transaction_count DESC, total_volume DESC
      LIMIT ?
    `;

    const searchPattern = `${query}%`;
    const [rows] = await this.db.execute<RowDataPacket[]>(
      searchQuery,
      [searchPattern, searchPattern, limit]
    );

    const results = rows.map(row => ({
      address: row.address,
      transaction_count: row.transaction_count,
      total_volume: row.total_volume.toString(),
      last_activity: new Date(row.last_activity)
    })) as AddressSearch[];

    // Cache for 2 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(results), 120);
    } catch (error) {
      console.warn('Failed to cache address search:', error);
    }

    return results;
  }

  /**
   * Get addresses ranked by frequency (most active)
   */
  async getTopAddressesByFrequency(
    filters: AddressRankingFilters = {},
    limit: number = 50
  ): Promise<TopAddressesResponse> {
    const cacheKey = `top_addresses_frequency:${JSON.stringify({ filters, limit })}`;

    // Try to get from cache first
    try {
      const cached = await RedisConnection.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache miss for top addresses by frequency:', error);
    }

    // Build time period filter
    const { start_date, end_date } = this.getTimePeriod(filters.time_period || 'all');

    // Build WHERE clause
    const { whereClause, params } = this.buildAddressWhereClause(filters, start_date, end_date);

    const query = `
      SELECT
        COALESCE(from_address, to_address) as address,
        SUM(CAST(amount AS DECIMAL(65,0))) as total_volume,
        COUNT(*) as transaction_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM (
        SELECT from_address as address, amount, timestamp ${filters.token ? ', token_symbol' : ''}
        FROM transactions
        ${whereClause}
        UNION ALL
        SELECT to_address as address, amount, timestamp ${filters.token ? ', token_symbol' : ''}
        FROM transactions
        ${whereClause}
      ) as combined_transactions
      WHERE address IS NOT NULL
      GROUP BY address
      HAVING transaction_count >= ${filters.min_transactions || 1}
        AND total_volume > ${filters.min_volume || '0'}
      ORDER BY transaction_count DESC, total_volume DESC
      LIMIT ?
    `;

    const [rows] = await this.db.execute<RowDataPacket[]>(query, [...params, ...params, limit]);

    const rankings = rows.map((row, index) => ({
      address: row.address,
      total_volume: row.total_volume.toString(),
      transaction_count: row.transaction_count,
      first_seen: new Date(row.first_seen),
      last_seen: new Date(row.last_seen),
      rank: index + 1
    })) as AddressRanking[];

    const response: TopAddressesResponse = {
      data: rankings,
      filters,
      period: {
        start_date,
        end_date
      },
      timestamp: new Date()
    };

    // Cache the response for 5 minutes
    try {
      await RedisConnection.set(cacheKey, JSON.stringify(response), 300);
    } catch (error) {
      console.warn('Failed to cache top addresses by frequency:', error);
    }

    return response;
  }

  /**
   * Build WHERE clause for address filtering
   */
  private buildAddressWhereClause(
    filters: AddressRankingFilters,
    start_date: Date,
    end_date: Date
  ): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.token) {
      conditions.push('token_symbol = ?');
      params.push(filters.token);
    }

    if (filters.time_period && filters.time_period !== 'all') {
      conditions.push('timestamp >= ? AND timestamp <= ?');
      params.push(start_date.toISOString(), end_date.toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }

  /**
   * Get time period dates based on filter
   */
  private getTimePeriod(period: 'day' | 'week' | 'month' | 'all'): { start_date: Date; end_date: Date } {
    const end_date = new Date();
    let start_date = new Date();

    switch (period) {
      case 'day':
        start_date.setDate(end_date.getDate() - 1);
        break;
      case 'week':
        start_date.setDate(end_date.getDate() - 7);
        break;
      case 'month':
        start_date.setMonth(end_date.getMonth() - 1);
        break;
      case 'all':
      default:
        start_date = new Date('2020-01-01'); // Far back start date
        break;
    }

    return { start_date, end_date };
  }
}