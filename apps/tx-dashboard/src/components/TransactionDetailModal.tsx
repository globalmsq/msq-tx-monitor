import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  ExternalLink,
  Copy,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Transaction } from '../types/transaction';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailModalProps) {
  if (!isOpen || !transaction) return null;

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-white/70';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className='w-4 h-4' />;
      case 'pending':
        return (
          <div className='w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin' />
        );
      case 'failed':
        return <X className='w-4 h-4' />;
      default:
        return null;
    }
  };

  const polygonExplorerUrl = `https://polygonscan.com/tx/${transaction.hash}`;

  const modalContent = (
    <div
      className='fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4'
      style={{ position: 'fixed', inset: 0 }}
    >
      <div className='bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-white/10'>
          <h2 className='text-xl font-bold text-white'>Transaction Details</h2>
          <button
            onClick={onClose}
            className='p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Status */}
          <div className='flex items-center space-x-3'>
            <div
              className={cn(
                'flex items-center space-x-2',
                getStatusColor(transaction.status)
              )}
            >
              {getStatusIcon(transaction.status)}
              <span className='text-lg font-semibold capitalize'>
                {transaction.status}
              </span>
            </div>
            {transaction.anomalyScore && transaction.anomalyScore > 0.5 && (
              <div className='flex items-center space-x-2 text-orange-400'>
                <AlertTriangle className='w-4 h-4' />
                <span className='text-sm'>
                  High Anomaly Score:{' '}
                  {(transaction.anomalyScore * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Transaction Hash */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-white/70'>
              Transaction Hash
            </label>
            <div className='flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg p-3'>
              <code className='text-sm text-white font-mono flex-1 break-all'>
                {transaction.hash}
              </code>
              <button
                onClick={() => copyToClipboard(transaction.hash)}
                className='p-1 text-white/70 hover:text-white transition-colors'
                title='Copy hash'
              >
                <Copy className='w-4 h-4' />
              </button>
              <a
                href={polygonExplorerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='p-1 text-white/70 hover:text-white transition-colors'
                title='View on Polygonscan'
              >
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
          </div>

          {/* From/To Addresses */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>From</label>
              <div className='flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg p-3'>
                <code className='text-sm text-white font-mono flex-1 break-all'>
                  {transaction.from}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.from)}
                  className='p-1 text-white/70 hover:text-white transition-colors'
                  title='Copy address'
                >
                  <Copy className='w-4 h-4' />
                </button>
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>To</label>
              <div className='flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg p-3'>
                <code className='text-sm text-white font-mono flex-1 break-all'>
                  {transaction.to}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.to)}
                  className='p-1 text-white/70 hover:text-white transition-colors'
                  title='Copy address'
                >
                  <Copy className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Amount and Token */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>
                Amount
              </label>
              <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
                <div className='flex items-center space-x-2'>
                  <div className='w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center'>
                    <span className='text-primary-400 font-mono text-xs'>
                      {transaction.token}
                    </span>
                  </div>
                  <div>
                    <p className='text-white font-semibold'>
                      {transaction.value} {transaction.token}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>
                Block Number
              </label>
              <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
                <p className='text-white font-mono'>
                  {transaction.blockNumber.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Gas Information */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>
                Gas Used
              </label>
              <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
                <p className='text-white font-mono'>
                  {parseInt(transaction.gasUsed).toLocaleString()}
                </p>
              </div>
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>
                Gas Price (Gwei)
              </label>
              <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
                <p className='text-white font-mono'>
                  {(parseInt(transaction.gasPrice) / 1e9).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-white/70'>
              Timestamp
            </label>
            <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
              <p className='text-white'>
                {new Date(transaction.timestamp).toLocaleString()}
              </p>
              <p className='text-white/60 text-sm'>
                {Math.floor((Date.now() - transaction.timestamp) / 1000)}{' '}
                seconds ago
              </p>
            </div>
          </div>

          {/* Anomaly Information */}
          {transaction.anomalyScore !== undefined && (
            <div className='space-y-2'>
              <label className='text-sm font-medium text-white/70'>
                Anomaly Analysis
              </label>
              <div className='bg-black/40 border border-white/10 rounded-lg p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-white text-sm'>Anomaly Score</span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      transaction.anomalyScore > 0.7
                        ? 'text-red-400'
                        : transaction.anomalyScore > 0.4
                          ? 'text-orange-400'
                          : 'text-green-400'
                    )}
                  >
                    {(transaction.anomalyScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className='w-full bg-white/10 rounded-full h-2'>
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      transaction.anomalyScore > 0.7
                        ? 'bg-red-400'
                        : transaction.anomalyScore > 0.4
                          ? 'bg-orange-400'
                          : 'bg-green-400'
                    )}
                    style={{ width: `${transaction.anomalyScore * 100}%` }}
                  />
                </div>
                <p className='text-white/60 text-xs mt-2'>
                  {transaction.anomalyScore > 0.7
                    ? 'High risk - suspicious activity detected'
                    : transaction.anomalyScore > 0.4
                      ? 'Medium risk - unusual pattern detected'
                      : 'Low risk - normal transaction pattern'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end p-6 border-t border-white/10'>
          <button
            onClick={onClose}
            className='px-6 py-2 glass rounded-lg text-white hover:bg-white/10 transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
}
