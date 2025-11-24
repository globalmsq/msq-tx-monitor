import { Provider, Scope } from '@nestjs/common';
import { TokenDataLoader } from './token.dataloader.js';

/**
 * DataLoader provider token
 */
export const DATALOADERS = 'DATALOADERS';

/**
 * DataLoaders interface
 * Centralized access to all dataloaders
 */
export interface DataLoaders {
  tokenLoader: TokenDataLoader;
}

/**
 * DataLoader provider
 * Creates request-scoped dataloader instances
 */
export const DataLoaderProvider: Provider = {
  provide: DATALOADERS,
  scope: Scope.REQUEST,
  useFactory: (tokenLoader: TokenDataLoader): DataLoaders => ({
    tokenLoader,
  }),
  inject: [TokenDataLoader],
};
