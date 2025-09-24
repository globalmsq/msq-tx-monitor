import React, { useState, useEffect } from 'react';
import {
  Filter,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Share,
  Bookmark,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { FilterState, useUrlFilterSync } from '../hooks/useUrlFilterSync';
import { FilterPresetManager } from './filters/FilterPresetManager';
import { AddressSearchInput } from './filters/AddressSearchInput';
import {
  getTimeRangePresets,
  getAmountRangePresets,
  hasActiveFilters,
} from '../utils/filterUtils';

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
  const [activeTab, setActiveTab] = useState<'filters' | 'presets'>('filters');
  const { getShareableUrl, DEFAULT_FILTER_STATE } = useUrlFilterSync();

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  if (!isOpen) return null;

  const tokens = ['MSQ', 'SUT', 'KWT', 'P2UC'];
  const timePresets = getTimeRangePresets();
  const amountPresets = getAmountRangePresets();
  const hasFilters = hasActiveFilters(localFilters, DEFAULT_FILTER_STATE);

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
    setLocalFilters(DEFAULT_FILTER_STATE);
    onFiltersChange(DEFAULT_FILTER_STATE);
    onReset();
  };

  const handleShare = async () => {
    const shareUrl = getShareableUrl(localFilters);
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Filter URL copied to clipboard!');
    } catch (error) {
      window.prompt('Copy this URL to share your filters:', shareUrl);
    }
  };

  const handleTimePreset = (preset: { from?: string; to?: string }) => {
    updateLocalFilters({
      timeRange: {
        from: preset.from || '',
        to: preset.to || '',
      },
    });
  };

  const handleAmountPreset = (preset: { min?: string; max?: string }) => {
    updateLocalFilters({
      amountRange: {
        min: preset.min || '',
        max: preset.max || '',
      },
    });
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
            {hasFilters && (
              <div className='w-2 h-2 bg-primary-400 rounded-full' />
            )}
          </div>
          <div className='flex items-center space-x-2'>
            <button
              onClick={handleShare}
              disabled={!hasFilters}
              className={cn(
                'p-2 rounded-lg transition-colors',
                hasFilters
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-white/30 cursor-not-allowed'
              )}
              title='Share Filters'
            >
              <Share className='w-5 h-5' />
            </button>
            <button
              onClick={onClose}
              className='p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-white/10'>
          <button
            onClick={() => setActiveTab('filters')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'filters'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-white/70 hover:text-white'
            )}
          >
            <Filter className='w-4 h-4 inline mr-2' />
            Filters
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'presets'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-white/70 hover:text-white'
            )}
          >
            <Bookmark className='w-4 h-4 inline mr-2' />
            Presets
          </button>
        </div>

        {/* Content */}
        <div className='p-4 sm:p-6 max-h-[60vh] overflow-y-auto'>
          {activeTab === 'presets' ? (
            <FilterPresetManager
              currentFilters={localFilters}
              onApplyPreset={presetFilters => {
                setLocalFilters(presetFilters);
                onFiltersChange(presetFilters);
                onApply();
                onClose();
              }}
              className='h-full'
            />
          ) : (
            <div className='space-y-6 sm:space-y-8'>
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
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-white'>
                    Amount Range
                  </h3>
                  <div className='flex space-x-1'>
                    {amountPresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => handleAmountPreset(preset)}
                        className='px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded transition-colors'
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-white'>
                    Time Range
                  </h3>
                  <div className='flex space-x-1'>
                    {timePresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => handleTimePreset(preset)}
                        className='px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded transition-colors'
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                    <label className='text-sm font-medium text-white/70'>
                      To
                    </label>
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
                <h3 className='text-lg font-semibold text-white'>
                  Address Search
                </h3>
                <AddressSearchInput
                  value={localFilters.addressSearch}
                  onChange={value =>
                    updateLocalFilters({ addressSearch: value })
                  }
                  placeholder='Search by address (0x...) - supports multiple addresses'
                />
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
                        onChange={() =>
                          updateLocalFilters({ riskLevel: level })
                        }
                        className='sr-only'
                      />
                      <div className='flex items-center space-x-2'>
                        {level === 'high' && (
                          <AlertTriangle className='w-4 h-4' />
                        )}
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
                        localFilters.showAnomalies
                          ? 'bg-orange-500'
                          : 'bg-white/20'
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
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-6 border-t border-white/10'>
          <div className='flex items-center space-x-3'>
            <button
              onClick={handleReset}
              disabled={!hasFilters}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors',
                hasFilters
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-white/30 cursor-not-allowed'
              )}
            >
              <RotateCcw className='w-4 h-4' />
              <span>Reset</span>
            </button>
            {hasFilters && (
              <span className='text-xs text-white/50'>
                {
                  Object.entries(localFilters).filter(([key, value]) => {
                    if (key === 'tokens')
                      return (
                        JSON.stringify(value) !==
                        JSON.stringify(DEFAULT_FILTER_STATE.tokens)
                      );
                    if (key === 'amountRange') return value.min || value.max;
                    if (key === 'timeRange') return value.from || value.to;
                    if (key === 'addressSearch') return value;
                    if (key === 'showAnomalies')
                      return value !== DEFAULT_FILTER_STATE.showAnomalies;
                    if (key === 'riskLevel')
                      return value !== DEFAULT_FILTER_STATE.riskLevel;
                    return false;
                  }).length
                }{' '}
                active filters
              </span>
            )}
          </div>
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
