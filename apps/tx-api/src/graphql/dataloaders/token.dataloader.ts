import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { TokenModel } from '../models/token.model.js';

/**
 * Token DataLoader for batching and caching token queries
 * Prevents N+1 query problem when resolving nested token fields
 */
@Injectable({ scope: Scope.REQUEST })
export class TokenDataLoader {
  constructor(private readonly subgraphClient: SubgraphClient) {}

  private readonly loader = new DataLoader<string, TokenModel | null>(
    async (tokenIds: readonly string[]) => {
      // Batch fetch tokens by IDs
      const tokens = await this.fetchTokensByIds([...tokenIds]);

      // Create a map for quick lookup
      const tokenMap = new Map(tokens.map(token => [token.id, token]));

      // Return tokens in the same order as requested IDs
      // Return null for tokens that don't exist
      return tokenIds.map(id => tokenMap.get(id) || null);
    },
    {
      cache: true,
      maxBatchSize: 100,
    }
  );

  /**
   * Load a single token by ID
   */
  async load(tokenId: string): Promise<TokenModel | null> {
    return this.loader.load(tokenId);
  }

  /**
   * Load multiple tokens by IDs
   */
  async loadMany(tokenIds: string[]): Promise<(TokenModel | null)[]> {
    return this.loader.loadMany(tokenIds) as Promise<(TokenModel | null)[]>;
  }

  /**
   * Fetch tokens from SubgraphClient by IDs
   * Note: SubgraphClient doesn't support filtering by ID, so we fetch all and filter
   */
  private async fetchTokensByIds(ids: string[]): Promise<TokenModel[]> {
    // Fetch all tokens (limited set for MSQ ecosystem)
    const tokens = await this.subgraphClient.getTokens(100, 0);

    // Filter to only requested IDs and create map
    const filteredTokens = tokens.filter(token => ids.includes(token.id));

    return filteredTokens.map(token => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals.toString(),
    }));
  }
}
