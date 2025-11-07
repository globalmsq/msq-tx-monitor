import { subgraphClient } from './subgraph-client';

describe('subgraphClient', () => {
  it('should work', () => {
    expect(subgraphClient()).toEqual('subgraph-client');
  });
});
