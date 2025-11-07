import { GraphQLClient, RequestOptions } from 'graphql-request';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: any; output: any; }
  BigInt: { input: string; output: string; }
  Bytes: { input: string; output: string; }
  Int8: { input: number; output: number; }
  Timestamp: { input: any; output: any; }
};

export type Aggregation_Interval =
  | 'day'
  | 'hour';

export type BlockChangedFilter = {
  readonly number_gte: Scalars['Int']['input'];
};

export type Block_Height = {
  readonly hash?: InputMaybe<Scalars['Bytes']['input']>;
  readonly number?: InputMaybe<Scalars['Int']['input']>;
  readonly number_gte?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Daily aggregated statistics per token
 * Time-series data for analytics and charting
 */
export type DailySnapshot = {
  readonly __typename?: 'DailySnapshot';
  readonly burnCount: Scalars['BigInt']['output'];
  readonly burnVolume: Scalars['BigInt']['output'];
  readonly date: Scalars['BigInt']['output'];
  readonly holderCount: Scalars['BigInt']['output'];
  readonly id: Scalars['Bytes']['output'];
  readonly mintCount: Scalars['BigInt']['output'];
  readonly mintVolume: Scalars['BigInt']['output'];
  readonly newHolders: Scalars['BigInt']['output'];
  readonly receiverAddresses: ReadonlyArray<Scalars['Bytes']['output']>;
  readonly senderAddresses: ReadonlyArray<Scalars['Bytes']['output']>;
  readonly token: Token;
  readonly transferCount: Scalars['BigInt']['output'];
  readonly uniqueAddresses: Scalars['BigInt']['output'];
  readonly uniqueReceivers: Scalars['BigInt']['output'];
  readonly uniqueSenders: Scalars['BigInt']['output'];
  readonly volumeTransferred: Scalars['BigInt']['output'];
};

export type DailySnapshot_Filter = {
  /** Filter for the block changed event. */
  readonly _change_block?: InputMaybe<BlockChangedFilter>;
  readonly and?: InputMaybe<ReadonlyArray<InputMaybe<DailySnapshot_Filter>>>;
  readonly burnCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly burnCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly burnVolume?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly burnVolume_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnVolume_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly date?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly date_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly date_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly holderCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly holderCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly id?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly mintCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintVolume?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintVolume_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintVolume_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly newHolders?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly newHolders_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly newHolders_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly or?: InputMaybe<ReadonlyArray<InputMaybe<DailySnapshot_Filter>>>;
  readonly receiverAddresses?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly receiverAddresses_contains?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly receiverAddresses_contains_nocase?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly receiverAddresses_not?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly receiverAddresses_not_contains?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly receiverAddresses_not_contains_nocase?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses_contains?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses_contains_nocase?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses_not?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses_not_contains?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly senderAddresses_not_contains_nocase?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly token?: InputMaybe<Scalars['String']['input']>;
  readonly token_?: InputMaybe<Token_Filter>;
  readonly token_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_gt?: InputMaybe<Scalars['String']['input']>;
  readonly token_gte?: InputMaybe<Scalars['String']['input']>;
  readonly token_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_lt?: InputMaybe<Scalars['String']['input']>;
  readonly token_lte?: InputMaybe<Scalars['String']['input']>;
  readonly token_not?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly transferCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transferCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueAddresses?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueAddresses_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueReceivers?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueReceivers_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueReceivers_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueSenders?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueSenders_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueSenders_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly volumeTransferred?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly volumeTransferred_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
};

export type DailySnapshot_OrderBy =
  | 'burnCount'
  | 'burnVolume'
  | 'date'
  | 'holderCount'
  | 'id'
  | 'mintCount'
  | 'mintVolume'
  | 'newHolders'
  | 'receiverAddresses'
  | 'senderAddresses'
  | 'token'
  | 'token__address'
  | 'token__burnCount'
  | 'token__decimals'
  | 'token__deployBlock'
  | 'token__firstTransferTimestamp'
  | 'token__holderCount'
  | 'token__id'
  | 'token__implementationAddress'
  | 'token__isMintable'
  | 'token__isPausable'
  | 'token__isProxy'
  | 'token__lastTransferTimestamp'
  | 'token__mintCount'
  | 'token__name'
  | 'token__symbol'
  | 'token__totalSupply'
  | 'token__totalVolumeTransferred'
  | 'token__transferCount'
  | 'transferCount'
  | 'uniqueAddresses'
  | 'uniqueReceivers'
  | 'uniqueSenders'
  | 'volumeTransferred';

/**
 * Hourly aggregated statistics per token (optional, for high-resolution analytics)
 * Can be commented out if not needed to reduce storage
 */
export type HourlySnapshot = {
  readonly __typename?: 'HourlySnapshot';
  readonly burnCount: Scalars['BigInt']['output'];
  readonly hour: Scalars['BigInt']['output'];
  readonly id: Scalars['Bytes']['output'];
  readonly mintCount: Scalars['BigInt']['output'];
  readonly token: Token;
  readonly transferCount: Scalars['BigInt']['output'];
  readonly uniqueAddresses: Scalars['BigInt']['output'];
  readonly volumeTransferred: Scalars['BigInt']['output'];
};

export type HourlySnapshot_Filter = {
  /** Filter for the block changed event. */
  readonly _change_block?: InputMaybe<BlockChangedFilter>;
  readonly and?: InputMaybe<ReadonlyArray<InputMaybe<HourlySnapshot_Filter>>>;
  readonly burnCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly burnCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly hour?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly hour_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly hour_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly id?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly mintCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly or?: InputMaybe<ReadonlyArray<InputMaybe<HourlySnapshot_Filter>>>;
  readonly token?: InputMaybe<Scalars['String']['input']>;
  readonly token_?: InputMaybe<Token_Filter>;
  readonly token_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_gt?: InputMaybe<Scalars['String']['input']>;
  readonly token_gte?: InputMaybe<Scalars['String']['input']>;
  readonly token_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_lt?: InputMaybe<Scalars['String']['input']>;
  readonly token_lte?: InputMaybe<Scalars['String']['input']>;
  readonly token_not?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly transferCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transferCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueAddresses?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly uniqueAddresses_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly uniqueAddresses_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly volumeTransferred?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly volumeTransferred_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly volumeTransferred_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
};

export type HourlySnapshot_OrderBy =
  | 'burnCount'
  | 'hour'
  | 'id'
  | 'mintCount'
  | 'token'
  | 'token__address'
  | 'token__burnCount'
  | 'token__decimals'
  | 'token__deployBlock'
  | 'token__firstTransferTimestamp'
  | 'token__holderCount'
  | 'token__id'
  | 'token__implementationAddress'
  | 'token__isMintable'
  | 'token__isPausable'
  | 'token__isProxy'
  | 'token__lastTransferTimestamp'
  | 'token__mintCount'
  | 'token__name'
  | 'token__symbol'
  | 'token__totalSupply'
  | 'token__totalVolumeTransferred'
  | 'token__transferCount'
  | 'transferCount'
  | 'uniqueAddresses'
  | 'volumeTransferred';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Query = {
  readonly __typename?: 'Query';
  /** Access to subgraph metadata */
  readonly _meta: Maybe<_Meta_>;
  readonly dailySnapshot: Maybe<DailySnapshot>;
  readonly dailySnapshots: ReadonlyArray<DailySnapshot>;
  readonly hourlySnapshot: Maybe<HourlySnapshot>;
  readonly hourlySnapshots: ReadonlyArray<HourlySnapshot>;
  readonly token: Maybe<Token>;
  readonly tokenAccount: Maybe<TokenAccount>;
  readonly tokenAccounts: ReadonlyArray<TokenAccount>;
  readonly tokens: ReadonlyArray<Token>;
  readonly transfer: Maybe<Transfer>;
  readonly transfers: ReadonlyArray<Transfer>;
};


export type Query_MetaArgs = {
  block?: InputMaybe<Block_Height>;
};


export type QueryDailySnapshotArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryDailySnapshotsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<DailySnapshot_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<DailySnapshot_Filter>;
};


export type QueryHourlySnapshotArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryHourlySnapshotsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<HourlySnapshot_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<HourlySnapshot_Filter>;
};


export type QueryTokenArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryTokenAccountArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryTokenAccountsArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TokenAccount_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<TokenAccount_Filter>;
};


export type QueryTokensArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Token_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Token_Filter>;
};


export type QueryTransferArgs = {
  block?: InputMaybe<Block_Height>;
  id: Scalars['ID']['input'];
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryTransfersArgs = {
  block?: InputMaybe<Block_Height>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  subgraphError?: _SubgraphErrorPolicy_;
  where?: InputMaybe<Transfer_Filter>;
};

/**
 * Global token entity - one per ERC-20 contract
 * Stores aggregate statistics and metadata for each token
 */
export type Token = {
  readonly __typename?: 'Token';
  readonly accounts: ReadonlyArray<TokenAccount>;
  readonly address: Scalars['Bytes']['output'];
  readonly burnCount: Scalars['BigInt']['output'];
  readonly dailySnapshots: ReadonlyArray<DailySnapshot>;
  readonly decimals: Scalars['Int']['output'];
  readonly deployBlock: Scalars['BigInt']['output'];
  readonly firstTransferTimestamp: Maybe<Scalars['BigInt']['output']>;
  readonly holderCount: Scalars['BigInt']['output'];
  readonly id: Scalars['Bytes']['output'];
  readonly implementationAddress: Maybe<Scalars['Bytes']['output']>;
  readonly isMintable: Scalars['Boolean']['output'];
  readonly isPausable: Scalars['Boolean']['output'];
  readonly isProxy: Scalars['Boolean']['output'];
  readonly lastTransferTimestamp: Maybe<Scalars['BigInt']['output']>;
  readonly mintCount: Scalars['BigInt']['output'];
  readonly name: Scalars['String']['output'];
  readonly symbol: Scalars['String']['output'];
  readonly totalSupply: Scalars['BigInt']['output'];
  readonly totalVolumeTransferred: Scalars['BigInt']['output'];
  readonly transferCount: Scalars['BigInt']['output'];
  readonly transfers: ReadonlyArray<Transfer>;
};


/**
 * Global token entity - one per ERC-20 contract
 * Stores aggregate statistics and metadata for each token
 */
export type TokenAccountsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<TokenAccount_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<TokenAccount_Filter>;
};


/**
 * Global token entity - one per ERC-20 contract
 * Stores aggregate statistics and metadata for each token
 */
export type TokenDailySnapshotsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<DailySnapshot_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<DailySnapshot_Filter>;
};


/**
 * Global token entity - one per ERC-20 contract
 * Stores aggregate statistics and metadata for each token
 */
export type TokenTransfersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Transfer_Filter>;
};

/**
 * Account holdings per token
 * Composite entity: one per (token, account) pair
 * An account can have balances across multiple tokens
 */
export type TokenAccount = {
  readonly __typename?: 'TokenAccount';
  readonly account: Scalars['Bytes']['output'];
  readonly balance: Scalars['BigInt']['output'];
  readonly firstTransferBlock: Scalars['BigInt']['output'];
  readonly firstTransferTimestamp: Scalars['BigInt']['output'];
  readonly id: Scalars['Bytes']['output'];
  readonly lastTransferBlock: Scalars['BigInt']['output'];
  readonly lastTransferTimestamp: Scalars['BigInt']['output'];
  readonly receivedCount: Scalars['BigInt']['output'];
  readonly receivedTransfers: ReadonlyArray<Transfer>;
  readonly sentCount: Scalars['BigInt']['output'];
  readonly sentTransfers: ReadonlyArray<Transfer>;
  readonly token: Token;
  readonly transferCount: Scalars['BigInt']['output'];
};


/**
 * Account holdings per token
 * Composite entity: one per (token, account) pair
 * An account can have balances across multiple tokens
 */
export type TokenAccountReceivedTransfersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Transfer_Filter>;
};


/**
 * Account holdings per token
 * Composite entity: one per (token, account) pair
 * An account can have balances across multiple tokens
 */
export type TokenAccountSentTransfersArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Transfer_Filter>;
};

export type TokenAccount_Filter = {
  /** Filter for the block changed event. */
  readonly _change_block?: InputMaybe<BlockChangedFilter>;
  readonly account?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly account_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly account_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly and?: InputMaybe<ReadonlyArray<InputMaybe<TokenAccount_Filter>>>;
  readonly balance?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly balance_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly balance_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferBlock?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferBlock_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferBlock_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly id?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly lastTransferBlock?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly lastTransferBlock_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferBlock_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly lastTransferTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly lastTransferTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly or?: InputMaybe<ReadonlyArray<InputMaybe<TokenAccount_Filter>>>;
  readonly receivedCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly receivedCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly receivedCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly receivedTransfers_?: InputMaybe<Transfer_Filter>;
  readonly sentCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly sentCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly sentCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly sentTransfers_?: InputMaybe<Transfer_Filter>;
  readonly token?: InputMaybe<Scalars['String']['input']>;
  readonly token_?: InputMaybe<Token_Filter>;
  readonly token_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_gt?: InputMaybe<Scalars['String']['input']>;
  readonly token_gte?: InputMaybe<Scalars['String']['input']>;
  readonly token_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_lt?: InputMaybe<Scalars['String']['input']>;
  readonly token_lte?: InputMaybe<Scalars['String']['input']>;
  readonly token_not?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly transferCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transferCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
};

export type TokenAccount_OrderBy =
  | 'account'
  | 'balance'
  | 'firstTransferBlock'
  | 'firstTransferTimestamp'
  | 'id'
  | 'lastTransferBlock'
  | 'lastTransferTimestamp'
  | 'receivedCount'
  | 'receivedTransfers'
  | 'sentCount'
  | 'sentTransfers'
  | 'token'
  | 'token__address'
  | 'token__burnCount'
  | 'token__decimals'
  | 'token__deployBlock'
  | 'token__firstTransferTimestamp'
  | 'token__holderCount'
  | 'token__id'
  | 'token__implementationAddress'
  | 'token__isMintable'
  | 'token__isPausable'
  | 'token__isProxy'
  | 'token__lastTransferTimestamp'
  | 'token__mintCount'
  | 'token__name'
  | 'token__symbol'
  | 'token__totalSupply'
  | 'token__totalVolumeTransferred'
  | 'token__transferCount'
  | 'transferCount';

export type Token_Filter = {
  /** Filter for the block changed event. */
  readonly _change_block?: InputMaybe<BlockChangedFilter>;
  readonly accounts_?: InputMaybe<TokenAccount_Filter>;
  readonly address?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly address_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly address_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly and?: InputMaybe<ReadonlyArray<InputMaybe<Token_Filter>>>;
  readonly burnCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly burnCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly burnCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly dailySnapshots_?: InputMaybe<DailySnapshot_Filter>;
  readonly decimals?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_gt?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_gte?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_in?: InputMaybe<ReadonlyArray<Scalars['Int']['input']>>;
  readonly decimals_lt?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_lte?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_not?: InputMaybe<Scalars['Int']['input']>;
  readonly decimals_not_in?: InputMaybe<ReadonlyArray<Scalars['Int']['input']>>;
  readonly deployBlock?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly deployBlock_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly deployBlock_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly firstTransferTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly firstTransferTimestamp_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly holderCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly holderCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly holderCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly id?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly implementationAddress?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly implementationAddress_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly implementationAddress_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly isMintable?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isMintable_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isMintable_not?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isMintable_not_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isPausable?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isPausable_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isPausable_not?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isPausable_not_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isProxy?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isProxy_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isProxy_not?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isProxy_not_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly lastTransferTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly lastTransferTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly lastTransferTimestamp_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly mintCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly mintCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly name?: InputMaybe<Scalars['String']['input']>;
  readonly name_contains?: InputMaybe<Scalars['String']['input']>;
  readonly name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly name_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly name_gt?: InputMaybe<Scalars['String']['input']>;
  readonly name_gte?: InputMaybe<Scalars['String']['input']>;
  readonly name_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly name_lt?: InputMaybe<Scalars['String']['input']>;
  readonly name_lte?: InputMaybe<Scalars['String']['input']>;
  readonly name_not?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly name_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly or?: InputMaybe<ReadonlyArray<InputMaybe<Token_Filter>>>;
  readonly symbol?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_contains?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_gt?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_gte?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly symbol_lt?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_lte?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly symbol_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly symbol_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly totalSupply?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly totalSupply_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalSupply_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly totalVolumeTransferred?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly totalVolumeTransferred_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly totalVolumeTransferred_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transferCount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transferCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly transferCount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly transfers_?: InputMaybe<Transfer_Filter>;
};

export type Token_OrderBy =
  | 'accounts'
  | 'address'
  | 'burnCount'
  | 'dailySnapshots'
  | 'decimals'
  | 'deployBlock'
  | 'firstTransferTimestamp'
  | 'holderCount'
  | 'id'
  | 'implementationAddress'
  | 'isMintable'
  | 'isPausable'
  | 'isProxy'
  | 'lastTransferTimestamp'
  | 'mintCount'
  | 'name'
  | 'symbol'
  | 'totalSupply'
  | 'totalVolumeTransferred'
  | 'transferCount'
  | 'transfers';

/**
 * Transfer event record
 * One entity per Transfer log emitted by token contracts
 */
export type Transfer = {
  readonly __typename?: 'Transfer';
  readonly amount: Scalars['BigInt']['output'];
  readonly blockNumber: Scalars['BigInt']['output'];
  readonly blockTimestamp: Scalars['BigInt']['output'];
  readonly from: Scalars['Bytes']['output'];
  readonly fromAccount: Maybe<TokenAccount>;
  readonly id: Scalars['Bytes']['output'];
  readonly isBurn: Scalars['Boolean']['output'];
  readonly isMint: Scalars['Boolean']['output'];
  readonly logIndex: Scalars['BigInt']['output'];
  readonly to: Scalars['Bytes']['output'];
  readonly toAccount: Maybe<TokenAccount>;
  readonly token: Token;
  readonly transactionHash: Scalars['Bytes']['output'];
};

export type Transfer_Filter = {
  /** Filter for the block changed event. */
  readonly _change_block?: InputMaybe<BlockChangedFilter>;
  readonly amount?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly amount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly amount_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly and?: InputMaybe<ReadonlyArray<InputMaybe<Transfer_Filter>>>;
  readonly blockNumber?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly blockNumber_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockNumber_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly blockTimestamp?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly blockTimestamp_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly blockTimestamp_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly from?: InputMaybe<Scalars['Bytes']['input']>;
  readonly fromAccount?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_?: InputMaybe<TokenAccount_Filter>;
  readonly fromAccount_contains?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_gt?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_gte?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly fromAccount_lt?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_lte?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly fromAccount_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly fromAccount_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly from_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly from_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly from_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly id_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly id_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly isBurn?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isBurn_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isBurn_not?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isBurn_not_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isMint?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isMint_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly isMint_not?: InputMaybe<Scalars['Boolean']['input']>;
  readonly isMint_not_in?: InputMaybe<ReadonlyArray<Scalars['Boolean']['input']>>;
  readonly logIndex?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_gt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_gte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly logIndex_lt?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_lte?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_not?: InputMaybe<Scalars['BigInt']['input']>;
  readonly logIndex_not_in?: InputMaybe<ReadonlyArray<Scalars['BigInt']['input']>>;
  readonly or?: InputMaybe<ReadonlyArray<InputMaybe<Transfer_Filter>>>;
  readonly to?: InputMaybe<Scalars['Bytes']['input']>;
  readonly toAccount?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_?: InputMaybe<TokenAccount_Filter>;
  readonly toAccount_contains?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_gt?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_gte?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly toAccount_lt?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_lte?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly toAccount_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly toAccount_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly to_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly to_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly to_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly token?: InputMaybe<Scalars['String']['input']>;
  readonly token_?: InputMaybe<Token_Filter>;
  readonly token_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_gt?: InputMaybe<Scalars['String']['input']>;
  readonly token_gte?: InputMaybe<Scalars['String']['input']>;
  readonly token_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_lt?: InputMaybe<Scalars['String']['input']>;
  readonly token_lte?: InputMaybe<Scalars['String']['input']>;
  readonly token_not?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_in?: InputMaybe<ReadonlyArray<Scalars['String']['input']>>;
  readonly token_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with?: InputMaybe<Scalars['String']['input']>;
  readonly token_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  readonly transactionHash?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_gt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_gte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
  readonly transactionHash_lt?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_lte?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_not?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
  readonly transactionHash_not_in?: InputMaybe<ReadonlyArray<Scalars['Bytes']['input']>>;
};

export type Transfer_OrderBy =
  | 'amount'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'from'
  | 'fromAccount'
  | 'fromAccount__account'
  | 'fromAccount__balance'
  | 'fromAccount__firstTransferBlock'
  | 'fromAccount__firstTransferTimestamp'
  | 'fromAccount__id'
  | 'fromAccount__lastTransferBlock'
  | 'fromAccount__lastTransferTimestamp'
  | 'fromAccount__receivedCount'
  | 'fromAccount__sentCount'
  | 'fromAccount__transferCount'
  | 'id'
  | 'isBurn'
  | 'isMint'
  | 'logIndex'
  | 'to'
  | 'toAccount'
  | 'toAccount__account'
  | 'toAccount__balance'
  | 'toAccount__firstTransferBlock'
  | 'toAccount__firstTransferTimestamp'
  | 'toAccount__id'
  | 'toAccount__lastTransferBlock'
  | 'toAccount__lastTransferTimestamp'
  | 'toAccount__receivedCount'
  | 'toAccount__sentCount'
  | 'toAccount__transferCount'
  | 'token'
  | 'token__address'
  | 'token__burnCount'
  | 'token__decimals'
  | 'token__deployBlock'
  | 'token__firstTransferTimestamp'
  | 'token__holderCount'
  | 'token__id'
  | 'token__implementationAddress'
  | 'token__isMintable'
  | 'token__isPausable'
  | 'token__isProxy'
  | 'token__lastTransferTimestamp'
  | 'token__mintCount'
  | 'token__name'
  | 'token__symbol'
  | 'token__totalSupply'
  | 'token__totalVolumeTransferred'
  | 'token__transferCount'
  | 'transactionHash';

export type _Block_ = {
  readonly __typename?: '_Block_';
  /** The hash of the block */
  readonly hash: Maybe<Scalars['Bytes']['output']>;
  /** The block number */
  readonly number: Scalars['Int']['output'];
  /** The hash of the parent block */
  readonly parentHash: Maybe<Scalars['Bytes']['output']>;
  /** Integer representation of the timestamp stored in blocks for the chain */
  readonly timestamp: Maybe<Scalars['Int']['output']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  readonly __typename?: '_Meta_';
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   */
  readonly block: _Block_;
  /** The deployment ID */
  readonly deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  readonly hasIndexingErrors: Scalars['Boolean']['output'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

export type GetTokenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTokenQuery = { readonly __typename?: 'Query', readonly token: { readonly __typename?: 'Token', readonly id: string, readonly address: string, readonly symbol: string, readonly name: string, readonly decimals: number, readonly totalSupply: string, readonly holderCount: string } | null };

export type GetTokensQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTokensQuery = { readonly __typename?: 'Query', readonly tokens: ReadonlyArray<{ readonly __typename?: 'Token', readonly id: string, readonly address: string, readonly symbol: string, readonly name: string, readonly decimals: number, readonly totalSupply: string, readonly holderCount: string }> };

export type GetTransfersQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Transfer_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Transfer_Filter>;
}>;


export type GetTransfersQuery = { readonly __typename?: 'Query', readonly transfers: ReadonlyArray<{ readonly __typename?: 'Transfer', readonly id: string, readonly from: string, readonly to: string, readonly amount: string, readonly isMint: boolean, readonly isBurn: boolean, readonly blockNumber: string, readonly blockTimestamp: string, readonly transactionHash: string, readonly logIndex: string, readonly token: { readonly __typename?: 'Token', readonly id: string, readonly symbol: string, readonly name: string, readonly decimals: number } }> };

export type GetTransfersByTokenQueryVariables = Exact<{
  token: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTransfersByTokenQuery = { readonly __typename?: 'Query', readonly transfers: ReadonlyArray<{ readonly __typename?: 'Transfer', readonly id: string, readonly from: string, readonly to: string, readonly amount: string, readonly isMint: boolean, readonly isBurn: boolean, readonly blockNumber: string, readonly blockTimestamp: string, readonly transactionHash: string, readonly logIndex: string }> };

export type GetTransfersByAddressQueryVariables = Exact<{
  address: Scalars['Bytes']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTransfersByAddressQuery = { readonly __typename?: 'Query', readonly transfers: ReadonlyArray<{ readonly __typename?: 'Transfer', readonly id: string, readonly from: string, readonly to: string, readonly amount: string, readonly isMint: boolean, readonly isBurn: boolean, readonly blockNumber: string, readonly blockTimestamp: string, readonly transactionHash: string, readonly logIndex: string, readonly token: { readonly __typename?: 'Token', readonly id: string, readonly symbol: string, readonly name: string, readonly decimals: number } }> };

export type GetTokenAccountQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTokenAccountQuery = { readonly __typename?: 'Query', readonly tokenAccount: { readonly __typename?: 'TokenAccount', readonly id: string, readonly account: string, readonly balance: string, readonly token: { readonly __typename?: 'Token', readonly id: string, readonly symbol: string, readonly name: string, readonly decimals: number } } | null };

export type GetTokenAccountsByTokenQueryVariables = Exact<{
  token: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTokenAccountsByTokenQuery = { readonly __typename?: 'Query', readonly tokenAccounts: ReadonlyArray<{ readonly __typename?: 'TokenAccount', readonly id: string, readonly account: string, readonly balance: string }> };

export type GetTokenAccountsByAddressQueryVariables = Exact<{
  address: Scalars['Bytes']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTokenAccountsByAddressQuery = { readonly __typename?: 'Query', readonly tokenAccounts: ReadonlyArray<{ readonly __typename?: 'TokenAccount', readonly id: string, readonly balance: string, readonly token: { readonly __typename?: 'Token', readonly id: string, readonly symbol: string, readonly name: string, readonly decimals: number } }> };

export type GetDailySnapshotsQueryVariables = Exact<{
  token: Scalars['String']['input'];
  date_gte: Scalars['BigInt']['input'];
  date_lte: Scalars['BigInt']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetDailySnapshotsQuery = { readonly __typename?: 'Query', readonly dailySnapshots: ReadonlyArray<{ readonly __typename?: 'DailySnapshot', readonly id: string, readonly date: string, readonly transferCount: string, readonly mintCount: string, readonly burnCount: string, readonly uniqueAddresses: string, readonly mintVolume: string, readonly burnVolume: string, readonly holderCount: string }> };

export type GetLatestDailySnapshotQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type GetLatestDailySnapshotQuery = { readonly __typename?: 'Query', readonly dailySnapshots: ReadonlyArray<{ readonly __typename?: 'DailySnapshot', readonly id: string, readonly date: string, readonly transferCount: string, readonly mintCount: string, readonly burnCount: string, readonly uniqueAddresses: string, readonly mintVolume: string, readonly burnVolume: string, readonly holderCount: string }> };

export type GetHourlySnapshotsQueryVariables = Exact<{
  token: Scalars['String']['input'];
  hour_gte: Scalars['BigInt']['input'];
  hour_lte: Scalars['BigInt']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetHourlySnapshotsQuery = { readonly __typename?: 'Query', readonly hourlySnapshots: ReadonlyArray<{ readonly __typename?: 'HourlySnapshot', readonly id: string, readonly hour: string, readonly transferCount: string, readonly mintCount: string, readonly burnCount: string, readonly uniqueAddresses: string }> };

export type GetLatestHourlySnapshotQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type GetLatestHourlySnapshotQuery = { readonly __typename?: 'Query', readonly hourlySnapshots: ReadonlyArray<{ readonly __typename?: 'HourlySnapshot', readonly id: string, readonly hour: string, readonly transferCount: string, readonly mintCount: string, readonly burnCount: string, readonly uniqueAddresses: string }> };

export type GetTokenStatisticsQueryVariables = Exact<{
  tokenId: Scalars['ID']['input'];
  tokenAddress: Scalars['Bytes']['input'];
}>;


export type GetTokenStatisticsQuery = { readonly __typename?: 'Query', readonly token: { readonly __typename?: 'Token', readonly id: string, readonly symbol: string, readonly name: string, readonly totalSupply: string, readonly holderCount: string } | null, readonly dailySnapshots: ReadonlyArray<{ readonly __typename?: 'DailySnapshot', readonly id: string, readonly date: string, readonly transferCount: string, readonly mintCount: string, readonly burnCount: string, readonly uniqueAddresses: string, readonly mintVolume: string, readonly burnVolume: string, readonly holderCount: string }> };


export const GetTokenDocument = `
    query GetToken($id: ID!) {
  token(id: $id) {
    id
    address
    symbol
    name
    decimals
    totalSupply
    holderCount
  }
}
    `;
export const GetTokensDocument = `
    query GetTokens($first: Int = 10, $skip: Int = 0) {
  tokens(first: $first, skip: $skip, orderBy: holderCount, orderDirection: desc) {
    id
    address
    symbol
    name
    decimals
    totalSupply
    holderCount
  }
}
    `;
export const GetTransfersDocument = `
    query GetTransfers($first: Int = 100, $skip: Int = 0, $orderBy: Transfer_orderBy, $orderDirection: OrderDirection, $where: Transfer_filter) {
  transfers(
    first: $first
    skip: $skip
    orderBy: $orderBy
    orderDirection: $orderDirection
    where: $where
  ) {
    id
    token {
      id
      symbol
      name
      decimals
    }
    from
    to
    amount
    isMint
    isBurn
    blockNumber
    blockTimestamp
    transactionHash
    logIndex
  }
}
    `;
export const GetTransfersByTokenDocument = `
    query GetTransfersByToken($token: String!, $first: Int = 100, $skip: Int = 0) {
  transfers(
    first: $first
    skip: $skip
    orderBy: blockTimestamp
    orderDirection: desc
    where: {token: $token}
  ) {
    id
    from
    to
    amount
    isMint
    isBurn
    blockNumber
    blockTimestamp
    transactionHash
    logIndex
  }
}
    `;
export const GetTransfersByAddressDocument = `
    query GetTransfersByAddress($address: Bytes!, $first: Int = 100, $skip: Int = 0) {
  transfers(
    first: $first
    skip: $skip
    orderBy: blockTimestamp
    orderDirection: desc
    where: {or: [{from: $address}, {to: $address}]}
  ) {
    id
    token {
      id
      symbol
      name
      decimals
    }
    from
    to
    amount
    isMint
    isBurn
    blockNumber
    blockTimestamp
    transactionHash
    logIndex
  }
}
    `;
export const GetTokenAccountDocument = `
    query GetTokenAccount($id: ID!) {
  tokenAccount(id: $id) {
    id
    token {
      id
      symbol
      name
      decimals
    }
    account
    balance
  }
}
    `;
export const GetTokenAccountsByTokenDocument = `
    query GetTokenAccountsByToken($token: String!, $first: Int = 100, $skip: Int = 0) {
  tokenAccounts(
    first: $first
    skip: $skip
    orderBy: balance
    orderDirection: desc
    where: {token: $token}
  ) {
    id
    account
    balance
  }
}
    `;
export const GetTokenAccountsByAddressDocument = `
    query GetTokenAccountsByAddress($address: Bytes!, $first: Int = 10, $skip: Int = 0) {
  tokenAccounts(
    first: $first
    skip: $skip
    orderBy: balance
    orderDirection: desc
    where: {account: $address}
  ) {
    id
    token {
      id
      symbol
      name
      decimals
    }
    balance
  }
}
    `;
export const GetDailySnapshotsDocument = `
    query GetDailySnapshots($token: String!, $date_gte: BigInt!, $date_lte: BigInt!, $first: Int = 100) {
  dailySnapshots(
    first: $first
    orderBy: date
    orderDirection: asc
    where: {token: $token, date_gte: $date_gte, date_lte: $date_lte}
  ) {
    id
    date
    transferCount
    mintCount
    burnCount
    uniqueAddresses
    mintVolume
    burnVolume
    holderCount
  }
}
    `;
export const GetLatestDailySnapshotDocument = `
    query GetLatestDailySnapshot($token: String!) {
  dailySnapshots(
    first: 1
    orderBy: date
    orderDirection: desc
    where: {token: $token}
  ) {
    id
    date
    transferCount
    mintCount
    burnCount
    uniqueAddresses
    mintVolume
    burnVolume
    holderCount
  }
}
    `;
export const GetHourlySnapshotsDocument = `
    query GetHourlySnapshots($token: String!, $hour_gte: BigInt!, $hour_lte: BigInt!, $first: Int = 100) {
  hourlySnapshots(
    first: $first
    orderBy: hour
    orderDirection: asc
    where: {token: $token, hour_gte: $hour_gte, hour_lte: $hour_lte}
  ) {
    id
    hour
    transferCount
    mintCount
    burnCount
    uniqueAddresses
  }
}
    `;
export const GetLatestHourlySnapshotDocument = `
    query GetLatestHourlySnapshot($token: String!) {
  hourlySnapshots(
    first: 1
    orderBy: hour
    orderDirection: desc
    where: {token: $token}
  ) {
    id
    hour
    transferCount
    mintCount
    burnCount
    uniqueAddresses
  }
}
    `;
export const GetTokenStatisticsDocument = `
    query GetTokenStatistics($tokenId: ID!, $tokenAddress: Bytes!) {
  token(id: $tokenId) {
    id
    symbol
    name
    totalSupply
    holderCount
  }
  dailySnapshots(
    first: 30
    orderBy: date
    orderDirection: desc
    where: {token_: {id: $tokenAddress}}
  ) {
    id
    date
    transferCount
    mintCount
    burnCount
    uniqueAddresses
    mintVolume
    burnVolume
    holderCount
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    GetToken(variables: GetTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokenQuery>({ document: GetTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetToken', 'query', variables);
    },
    GetTokens(variables?: GetTokensQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokensQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokensQuery>({ document: GetTokensDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTokens', 'query', variables);
    },
    GetTransfers(variables?: GetTransfersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTransfersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTransfersQuery>({ document: GetTransfersDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTransfers', 'query', variables);
    },
    GetTransfersByToken(variables: GetTransfersByTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTransfersByTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTransfersByTokenQuery>({ document: GetTransfersByTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTransfersByToken', 'query', variables);
    },
    GetTransfersByAddress(variables: GetTransfersByAddressQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTransfersByAddressQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTransfersByAddressQuery>({ document: GetTransfersByAddressDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTransfersByAddress', 'query', variables);
    },
    GetTokenAccount(variables: GetTokenAccountQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokenAccountQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokenAccountQuery>({ document: GetTokenAccountDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTokenAccount', 'query', variables);
    },
    GetTokenAccountsByToken(variables: GetTokenAccountsByTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokenAccountsByTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokenAccountsByTokenQuery>({ document: GetTokenAccountsByTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTokenAccountsByToken', 'query', variables);
    },
    GetTokenAccountsByAddress(variables: GetTokenAccountsByAddressQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokenAccountsByAddressQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokenAccountsByAddressQuery>({ document: GetTokenAccountsByAddressDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTokenAccountsByAddress', 'query', variables);
    },
    GetDailySnapshots(variables: GetDailySnapshotsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetDailySnapshotsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDailySnapshotsQuery>({ document: GetDailySnapshotsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetDailySnapshots', 'query', variables);
    },
    GetLatestDailySnapshot(variables: GetLatestDailySnapshotQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetLatestDailySnapshotQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetLatestDailySnapshotQuery>({ document: GetLatestDailySnapshotDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetLatestDailySnapshot', 'query', variables);
    },
    GetHourlySnapshots(variables: GetHourlySnapshotsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetHourlySnapshotsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetHourlySnapshotsQuery>({ document: GetHourlySnapshotsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetHourlySnapshots', 'query', variables);
    },
    GetLatestHourlySnapshot(variables: GetLatestHourlySnapshotQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetLatestHourlySnapshotQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetLatestHourlySnapshotQuery>({ document: GetLatestHourlySnapshotDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetLatestHourlySnapshot', 'query', variables);
    },
    GetTokenStatistics(variables: GetTokenStatisticsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GetTokenStatisticsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetTokenStatisticsQuery>({ document: GetTokenStatisticsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GetTokenStatistics', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;