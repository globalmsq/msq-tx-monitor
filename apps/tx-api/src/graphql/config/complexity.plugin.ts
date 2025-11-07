import {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { GraphQLError } from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { Logger } from '@nestjs/common';

/**
 * GraphQL query complexity plugin
 * Prevents expensive queries from overloading the server
 */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  private readonly logger = new Logger(ComplexityPlugin.name);
  private readonly MAX_COMPLEXITY = 1000;

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    const maxComplexity = this.MAX_COMPLEXITY;
    const logger = this.logger;

    return {
      async didResolveOperation({ request, document, schema }) {
        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });

        if (complexity > maxComplexity) {
          throw new GraphQLError(
            `Query complexity of ${complexity} exceeds maximum allowed complexity of ${maxComplexity}`,
            {
              extensions: {
                code: 'COMPLEXITY_LIMIT_EXCEEDED',
                complexity,
                maxComplexity,
              },
            }
          );
        }

        logger.debug(`Query Complexity: ${complexity}`);
      },
    };
  }
}
