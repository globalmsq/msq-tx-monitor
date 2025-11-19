import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
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
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
