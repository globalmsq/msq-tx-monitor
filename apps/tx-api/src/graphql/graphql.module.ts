import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLConfigService } from './config/graphql.config';
import { ComplexityPlugin } from './config/complexity.plugin';
import { TransactionResolver } from './resolvers/transaction.resolver';
import { StatisticsResolver } from './resolvers/statistics.resolver';
import { TokenDataLoader } from './dataloaders/token.dataloader';
import { DataLoaderProvider } from './dataloaders/dataloader.provider';
import { TransactionsModule } from '../transactions/transactions.module';

/**
 * GraphQL Module
 * Configures Apollo Server with code-first approach
 * Provides resolvers, dataloaders, and complexity analysis
 */
@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useClass: GraphQLConfigService,
      inject: [GraphQLConfigService, ComplexityPlugin],
    }),
    TransactionsModule,
  ],
  providers: [
    GraphQLConfigService,
    ComplexityPlugin,
    TransactionResolver,
    StatisticsResolver,
    TokenDataLoader,
    DataLoaderProvider,
  ],
  exports: [GraphQLModule],
})
export class GraphqlModule {}
