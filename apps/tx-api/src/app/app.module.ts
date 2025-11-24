import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validate } from '../config/env.validation.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { GraphqlModule } from '../graphql/graphql.module.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { AddressesModule } from '../addresses/addresses.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        ttl: (configService.get<number>('CACHE_TTL') || 300) * 1000, // Convert to milliseconds
      }),
    }),
    TransactionsModule,
    GraphqlModule,
    AnalyticsModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
