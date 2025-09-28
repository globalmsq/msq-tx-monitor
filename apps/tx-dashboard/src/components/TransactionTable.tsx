import React from 'react';
import { cn } from '../utils/cn';
import { TrendingUp, ExternalLink, Copy } from 'lucide-react';
import { Transaction } from '../types/transaction';
import { getRelativeTime, truncateHash, truncateAddress } from '../utils/dateUtils';

interface TransactionTableProps {
  transactions: Transaction[];
  onTransactionClick: (transaction: Transaction) => void;
  hasActiveFilters?: boolean;
}

interface TableRowProps {
  transaction: Transaction;
  onClick: (transaction: Transaction) => void;
  isEven: boolean;
}

function TableRow({ transaction, onClick, isEven }: TableRowProps) {
  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(transaction.hash);
  };

  const handleCopyAddress = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
  };

  return (
    <tr
      className={cn(
        'cursor-pointer hover:bg-white/5 transition-all duration-200 border-b border-white/5',
        isEven ? 'bg-white/[0.02]' : 'bg-transparent'
      )}
      onClick={() => onClick(transaction)}
    >
      {/* Transaction Hash */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <span
            className="text-primary-400 font-mono text-sm hover:text-primary-300 cursor-pointer"
            title={transaction.hash}
          >
            {truncateHash(transaction.hash)}
          </span>
          <button
            onClick={handleCopyHash}
            className="text-white/40 hover:text-white/60 transition-colors"
            title="Copy hash"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </td>

      {/* Token/Method */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary-500/20 rounded-md flex items-center justify-center">
            <span className="text-primary-400 font-mono text-xs">
              {transaction.token}
            </span>
          </div>
          <span className="text-white/80 text-sm font-medium">
            Transfer
          </span>
        </div>
      </td>

      {/* Block */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span
          className="text-primary-400 text-sm hover:text-primary-300 cursor-pointer"
          title={`Block #${transaction.blockNumber.toLocaleString()}`}
        >
          {transaction.blockNumber.toLocaleString()}
        </span>
      </td>

      {/* Age */}
      <td className="px-4 py-3">
        <span
          className="text-white/70 text-sm"
          title={new Date(transaction.timestamp).toLocaleString()}
        >
          {getRelativeTime(transaction.timestamp)}
        </span>
      </td>

      {/* From */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          {/* Desktop: From only */}
          <div className="hidden lg:flex items-center space-x-2">
            <span
              className="text-white/80 font-mono text-sm hover:text-white cursor-pointer"
              title={transaction.from}
            >
              {truncateAddress(transaction.from)}
            </span>
            <button
              onClick={(e) => handleCopyAddress(e, transaction.from)}
              className="text-white/40 hover:text-white/60 transition-colors"
              title="Copy from address"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          {/* Mobile/Tablet: From -> To */}
          <div className="lg:hidden flex items-center space-x-1">
            <span
              className="text-white/80 font-mono text-xs hover:text-white cursor-pointer"
              title={transaction.from}
            >
              {truncateAddress(transaction.from)}
            </span>
            <span className="text-white/40">→</span>
            <span
              className="text-white/80 font-mono text-xs hover:text-white cursor-pointer"
              title={transaction.to}
            >
              {truncateAddress(transaction.to)}
            </span>
          </div>
        </div>
      </td>

      {/* To */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex items-center space-x-2">
          <span
            className="text-white/80 font-mono text-sm hover:text-white cursor-pointer"
            title={transaction.to}
          >
            {truncateAddress(transaction.to)}
          </span>
          <button
            onClick={(e) => handleCopyAddress(e, transaction.to)}
            className="text-white/40 hover:text-white/60 transition-colors"
            title="Copy address"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </td>

      {/* Value */}
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className="text-white font-semibold text-sm">
            {transaction.value} {transaction.token}
          </span>
          {!!transaction.anomalyScore && transaction.anomalyScore > 0.3 && (
            <div className="flex items-center space-x-1 text-orange-400 text-xs mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Risk: {(transaction.anomalyScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </td>

      {/* Txn Fee */}
      <td className="px-4 py-3 text-right hidden lg:table-cell">
        <span className="text-white/70 text-sm">
          {transaction.txnFee || '-'}
        </span>
      </td>
    </tr>
  );
}

export function TransactionTable({ transactions, onTransactionClick, hasActiveFilters = false }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ExternalLink className="w-8 h-8 text-white/40" />
        </div>
        <p className="text-white/60 text-lg mb-2">No transactions found</p>
        <p className="text-white/40 text-sm">
          {hasActiveFilters
            ? 'No transactions match your current filters'
            : 'Waiting for new transactions...'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70">
              Txn Hash
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70">
              Method
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70 hidden sm:table-cell">
              Block
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70">
              Age
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70">
              <span className="hidden lg:inline">From</span>
              <span className="lg:hidden">From / To</span>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-white/70 hidden lg:table-cell">
              To
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-white/70">
              Value
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-white/70 hidden lg:table-cell">
              Txn Fee
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <TableRow
              key={transaction.id}
              transaction={transaction}
              onClick={onTransactionClick}
              isEven={index % 2 === 0}
            />
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}