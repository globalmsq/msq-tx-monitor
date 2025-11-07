import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsGateway } from './transactions.gateway';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsGateway,
    {
      provide: SubgraphClient,
      useFactory: (configService: ConfigService) => {
        return new SubgraphClient({
          endpoint: configService.get<string>('SUBGRAPH_ENDPOINT'),
          timeout: 10000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [TransactionsService, TransactionsGateway],
})
export class TransactionsModule {}
