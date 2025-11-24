export interface TokenDto {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
}

export interface TransactionResponseDto {
  id: string;
  token: TokenDto;
  from: string;
  to: string;
  amount: string;
  isMint: boolean;
  isBurn: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
  logIndex: string;
}

export interface TransactionsResponseDto {
  transactions: TransactionResponseDto[];
  total: number;
  limit: number;
  skip: number;
}
