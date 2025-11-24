import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLConfigService } from './config/graphql.config.js';
import { ComplexityPlugin } from './config/complexity.plugin.js';
import { TransactionResolver } from './resolvers/transaction.resolver.js';
import { StatisticsResolver } from './resolvers/statistics.resolver.js';
import { TokenDataLoader } from './dataloaders/token.dataloader.js';
import { DataLoaderProvider } from './dataloaders/dataloader.provider.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

/**
 * GraphQL Module
 * Configures Apollo Server with code-first approach
 * Provides resolvers, dataloaders, and complexity analysis
 */
@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const complexityPlugin = new ComplexityPlugin();
        const gqlConfigService = new GraphQLConfigService(
          configService,
          complexityPlugin
        );
        return gqlConfigService.createGqlOptions();
      },
      inject: [ConfigService],
    }),
    TransactionsModule,
  ],
  providers: [
    ComplexityPlugin,
    TransactionResolver,
    StatisticsResolver,
    TokenDataLoader,
    DataLoaderProvider,
  ],
  exports: [GraphQLModule],
})
export class GraphqlModule {}
