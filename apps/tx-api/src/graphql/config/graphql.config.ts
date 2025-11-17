import { Injectable } from '@nestjs/common';
import { GqlOptionsFactory, GqlModuleOptions } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ComplexityPlugin } from './complexity.plugin.js';

/**
 * GraphQL configuration service
 * Configures Apollo Server with code-first approach
 */
@Injectable()
export class GraphQLConfigService implements GqlOptionsFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly complexityPlugin: ComplexityPlugin
  ) {}

  createGqlOptions(): GqlModuleOptions {
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    return {
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/tx-api/src/graphql/schema.gql'),
      sortSchema: true,
      introspection: isDevelopment,
      context: ({ req, res }: any) => ({ req, res }),
      plugins: [this.complexityPlugin],
    } as GqlModuleOptions;
  }
}
