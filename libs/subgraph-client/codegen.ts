import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://api.studio.thegraph.com/query/1704765/msq-tokens-subgraph/version/latest',
  documents: './src/graphql/queries.graphql',
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-graphql-request',
      ],
      config: {
        scalars: {
          BigInt: 'string',
          Bytes: 'string',
          Int8: 'number',
        },
        skipTypename: false,
        enumsAsTypes: true,
        immutableTypes: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
        },
        // Add explicit return types to fix TS2742 errors
        documentMode: 'string',
      },
    },
  },
};

export default config;
