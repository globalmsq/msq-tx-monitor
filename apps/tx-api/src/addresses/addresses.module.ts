import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';
import { SubgraphClient } from '@msq-tx-monitor/subgraph-client';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AddressesController],
  providers: [
    AddressesService,
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
  exports: [AddressesService],
})
export class AddressesModule {}
