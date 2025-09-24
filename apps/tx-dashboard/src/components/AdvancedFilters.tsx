import React, { useState } from 'react';
import {
  Filter,
  Search,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface FilterState {
  tokens: string[];
  showAnomalies: boolean;
  amountRange: {
    min: string;
    max: string;
  };
  timeRange: {
    from: string;
    to: string;
  };
  addressSearch: string;
  riskLevel: 'all' | 'low' | 'medium' | 'high';
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

export function AdvancedFilters({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  if (!isOpen) return null;

  const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];

  const updateLocalFilters = (updates: Partial<FilterState>) => {
    setLocalFilters(prev => ({ ...prev, ...updates }));
  };

  const handleTokenToggle = (token: string) => {
    const newTokens = localFilters.tokens.includes(token)
      ? localFilters.tokens.filter(t => t !== token)
      : [...localFilters.tokens, token];
    updateLocalFilters({ tokens: newTokens });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply();
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      tokens: ['MSQ', 'SUT', 'KWT', 'P2UC'],
      showAnomalies: false,
      amountRange: { min: '', max: '' },
      timeRange: { from: '', to: '' },
      addressSearch: '',
      riskLevel: 'all',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset();
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-400 border-green-400';
      case 'medium':
        return 'text-orange-400 border-orange-400';
      case 'high':
        return 'text-red-400 border-red-400';
      default:
        return 'text-white/70 border-white/20';
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4'>
      <div className='glass rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 sm:p-6 border-b border-white/10'>
          <div className='flex items-center space-x-2 sm:space-x-3'>
            <Filter className='w-5 sm:w-6 h-5 sm:h-6 text-primary-400' />
            <h2 className='text-lg sm:text-xl font-bold text-white'>
              Advanced Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-4 sm:p-6 space-y-6 sm:space-y-8'>
          {/* Token Selection */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>
              Token Selection
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {tokens.map(token => (
                <label
                  key={token}
                  className={cn(
                    'flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all',
                    localFilters.tokens.includes(token)
                      ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  )}
                >
                  <input
                    type='checkbox'
                    checked={localFilters.tokens.includes(token)}
                    onChange={() => handleTokenToggle(token)}
                    className='sr-only'
                  />
                  <span className='font-mono font-semibold'>{token}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Amount Range</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-white/70'>
                  Minimum Amount
                </label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
                  <input
                    type='number'
                    value={localFilters.amountRange.min}
                    onChange={e =>
                      updateLocalFilters({
                        amountRange: {
                          ...localFilters.amountRange,
                          min: e.target.value,
                        },
                      })
                    }
                    placeholder='0.00'
                    className='w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-white/70'>
                  Maximum Amount
                </label>
                <div className='relative'>
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
                  <input
                    type='number'
                    value={localFilters.amountRange.max}
                    onChange={e =>
                      updateLocalFilters({
                        amountRange: {
                          ...localFilters.amountRange,
                          max: e.target.value,
                        },
                      })
                    }
                    placeholder='No limit'
                    className='w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time Range */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Time Range</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-white/70'>
                  From
                </label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
                  <input
                    type='datetime-local'
                    value={localFilters.timeRange.from}
                    onChange={e =>
                      updateLocalFilters({
                        timeRange: {
                          ...localFilters.timeRange,
                          from: e.target.value,
                        },
                      })
                    }
                    className='w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-white/70'>To</label>
                <div className='relative'>
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
                  <input
                    type='datetime-local'
                    value={localFilters.timeRange.to}
                    onChange={e =>
                      updateLocalFilters({
                        timeRange: {
                          ...localFilters.timeRange,
                          to: e.target.value,
                        },
                      })
                    }
                    className='w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Search */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Address Search</h3>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
              <input
                type='text'
                value={localFilters.addressSearch}
                onChange={e =>
                  updateLocalFilters({ addressSearch: e.target.value })
                }
                placeholder='Search by address (0x...)'
                className='w-full pl-10 pr-4 py-3 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50'
              />
            </div>
            <p className='text-sm text-white/60'>
              Filter transactions by specific sender or receiver address
            </p>
          </div>

          {/* Risk Level */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>Risk Level</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {(['all', 'low', 'medium', 'high'] as const).map(level => (
                <label
                  key={level}
                  className={cn(
                    'flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all',
                    localFilters.riskLevel === level
                      ? getRiskLevelColor(level)
                          .replace('text-', 'border-')
                          .replace('border-', 'border-') + ' bg-current/20'
                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                  )}
                >
                  <input
                    type='radio'
                    name='riskLevel'
                    checked={localFilters.riskLevel === level}
                    onChange={() => updateLocalFilters({ riskLevel: level })}
                    className='sr-only'
                  />
                  <div className='flex items-center space-x-2'>
                    {level === 'high' && <AlertTriangle className='w-4 h-4' />}
                    <span className='font-medium capitalize'>{level}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Anomaly Detection */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white'>
              Special Options
            </h3>
            <label className='flex items-center space-x-3 cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  checked={localFilters.showAnomalies}
                  onChange={e =>
                    updateLocalFilters({ showAnomalies: e.target.checked })
                  }
                  className='sr-only'
                />
                <div
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    localFilters.showAnomalies ? 'bg-orange-500' : 'bg-white/20'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform m-0.5',
                      localFilters.showAnomalies
                        ? 'translate-x-6'
                        : 'translate-x-0'
                    )}
                  />
                </div>
              </div>
              <div className='flex items-center space-x-2'>
                {localFilters.showAnomalies ? (
                  <Eye className='w-5 h-5 text-orange-400' />
                ) : (
                  <EyeOff className='w-5 h-5 text-white/70' />
                )}
                <span className='text-white'>
                  Show Only Anomalous Transactions
                </span>
              </div>
            </label>
            <p className='text-sm text-white/60 ml-15'>
              Filter to show only transactions with unusual patterns or high
              risk scores
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-6 border-t border-white/10'>
          <button
            onClick={handleReset}
            className='px-6 py-2 text-white/70 hover:text-white transition-colors'
          >
            Reset Filters
          </button>
          <div className='flex space-x-3'>
            <button
              onClick={onClose}
              className='px-6 py-2 glass rounded-lg text-white hover:bg-white/10 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className='px-6 py-2 bg-gradient-primary rounded-lg text-white hover:opacity-90 transition-opacity'
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
