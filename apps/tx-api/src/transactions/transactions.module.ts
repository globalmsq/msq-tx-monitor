import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsGateway } from './transactions.gateway.js';
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
  exports: [TransactionsService, TransactionsGateway, SubgraphClient],
})
export class TransactionsModule {}
