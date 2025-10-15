import React from 'react';
import { Copy, Check, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatVolume } from '@msq-tx-monitor/msq-common';
import { VolumeWithTooltip } from './VolumeWithTooltip';

interface AddressRanking {
  address: string;
  total_volume?: string;
  total_sent?: string;
  total_received?: string;
  transaction_count?: number;
  first_seen?: string;
  last_seen?: string;
  rank?: number;
}

interface AddressCategoryBoxProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  addresses: AddressRanking[];
  isLoading: boolean;
  selectedToken: string;
  onAddressClick: (address: string) => void;
  onCopyAddress: (address: string, e: React.MouseEvent) => void;
  copiedAddress: string | null;
  limit?: number;
}

export function AddressCategoryBox({
  title,
  icon,
  iconColor,
  addresses,
  isLoading,
  selectedToken,
  onAddressClick,
  onCopyAddress,
  copiedAddress,
  limit = 10,
}: AddressCategoryBoxProps) {
  const displayAddresses = addresses.slice(0, limit);

  return (
    <div className='glass rounded-2xl p-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className={cn('p-2 rounded-lg bg-white/10', iconColor)}>
            {icon}
          </div>
          <h3 className='text-lg font-bold text-white'>{title}</h3>
        </div>
        <span className='text-sm text-white/60'>Top {limit}</span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className='text-center py-8'>
          <div className='inline-block w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin'></div>
          <p className='text-white/60 mt-3 text-sm'>Loading addresses...</p>
        </div>
      ) : displayAddresses.length === 0 ? (
        /* Empty State */
        <div className='text-center py-8'>
          <p className='text-white/60 text-sm'>No addresses found</p>
        </div>
      ) : (
        /* Address List */
        <div className='space-y-2'>
          {displayAddresses.map((addr, index) => (
            <div
              key={addr.address}
              onClick={() => onAddressClick(addr.address)}
              className='p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-white/5'
            >
              <div className='flex items-start justify-between gap-3'>
                {/* Left: Rank + Address */}
                <div className='flex items-start gap-2 min-w-0 flex-1'>
                  <div className='flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-xs'>
                    {index + 1}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      {/* Address - responsive truncation */}
                      <span className='text-white font-mono text-xs truncate'>
                        <span className='hidden xl:inline'>{addr.address}</span>
                        <span className='hidden md:inline xl:hidden'>
                          {addr.address.slice(0, 12)}...
                          {addr.address.slice(-10)}
                        </span>
                        <span className='inline md:hidden'>
                          {addr.address.slice(0, 8)}...
                          {addr.address.slice(-6)}
                        </span>
                      </span>

                      {/* Copy button */}
                      <button
                        onClick={e => onCopyAddress(addr.address, e)}
                        className='flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors'
                        title='Copy address'
                      >
                        {copiedAddress === addr.address ? (
                          <Check className='w-3 h-3 text-green-400' />
                        ) : (
                          <Copy className='w-3 h-3 text-white/60 hover:text-white' />
                        )}
                      </button>
                    </div>
                    <div className='text-white/60 text-xs mt-1'>
                      {(addr.transaction_count ?? 0).toLocaleString()} transactions
                    </div>
                  </div>
                </div>

                {/* Right: Volume */}
                <div className='flex-shrink-0 text-right'>
                  <div className='text-white font-medium text-sm'>
                    <VolumeWithTooltip
                      formattedValue={formatVolume(
                        addr.total_volume ?? '0',
                        selectedToken,
                        {
                          precision: 0,
                        }
                      )}
                      rawValue={addr.total_volume ?? '0'}
                      tokenSymbol={selectedToken}
                      receivedValue={addr.total_received ?? '0'}
                      sentValue={addr.total_sent ?? '0'}
                      showBreakdown={true}
                    />
                  </div>
                  <div className='flex items-center justify-end gap-2 mt-1 text-xs text-white/60'>
                    <div className='flex items-center gap-1'>
                      <ArrowDown size={10} className='text-blue-400' />
                      <span>
                        {formatVolume(addr.total_received ?? '0', selectedToken, {
                          precision: 0,
                        })}
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <ArrowUp size={10} className='text-orange-400' />
                      <span>
                        {formatVolume(addr.total_sent ?? '0', selectedToken, {
                          precision: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
