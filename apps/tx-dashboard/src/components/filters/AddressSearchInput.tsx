import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, MapPin, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  isValidEthereumAddress,
  isPartialAddressSearch,
  parseAddressSearch,
} from '../../utils/filterUtils';

interface AddressSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  address: string;
  type: 'recent' | 'partial';
  label?: string;
  timestamp?: number;
}

const RECENT_ADDRESSES_KEY = 'msq-tx-monitor-recent-addresses';
const MAX_RECENT_ADDRESSES = 10;

// Mock function to simulate getting addresses from transaction history
// In a real app, this would query your transaction data
function getMockAddressMatches(query: string): SearchSuggestion[] {
  // This would normally query your transaction database
  const mockAddresses = [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x1234567890abcdef1234567890abcdef87654321',
    '0x12345678901234567890123456789012abcdef12',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0xfedcba0987654321fedcba0987654321fedcba09',
  ];

  if (query.length < 3) return [];

  return mockAddresses
    .filter(addr => addr.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(address => ({
      address,
      type: 'partial' as const,
      label: `${address.slice(0, 8)}...${address.slice(-6)}`,
    }));
}

function getRecentAddresses(): SearchSuggestion[] {
  try {
    const stored = localStorage.getItem(RECENT_ADDRESSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentAddress(address: string) {
  try {
    const recent = getRecentAddresses();
    const filtered = recent.filter(item => item.address !== address);
    const updated = [
      { address, type: 'recent' as const, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_ADDRESSES);

    localStorage.setItem(RECENT_ADDRESSES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent address:', error);
  }
}

export function AddressSearchInput({
  value,
  onChange,
  placeholder = 'Search addresses...',
  className,
}: AddressSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Update suggestions based on input
  useEffect(() => {
    if (inputValue.trim().length === 0) {
      setSuggestions(getRecentAddresses());
      return;
    }

    // Parse multiple addresses
    const addresses = parseAddressSearch(inputValue);
    const lastAddress = addresses[addresses.length - 1];

    if (lastAddress && lastAddress.length >= 3) {
      const matches = getMockAddressMatches(lastAddress);
      const recent = getRecentAddresses().filter(item =>
        item.address.toLowerCase().includes(lastAddress.toLowerCase())
      );
      setSuggestions([...recent.slice(0, 3), ...matches]);
    } else {
      setSuggestions(getRecentAddresses());
    }
  }, [inputValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const addresses = parseAddressSearch(inputValue);

    if (addresses.length > 1) {
      // Replace the last address with the suggestion
      const newAddresses = [...addresses.slice(0, -1), suggestion.address];
      const newValue = newAddresses.join(', ');
      setInputValue(newValue);
      onChange(newValue);
    } else {
      setInputValue(suggestion.address);
      onChange(suggestion.address);
    }

    if (
      suggestion.type === 'partial' &&
      isValidEthereumAddress(suggestion.address)
    ) {
      saveRecentAddress(suggestion.address);
    }

    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(inputValue);
      setIsOpen(false);

      // Save valid addresses to recent
      const addresses = parseAddressSearch(inputValue);
      addresses.forEach(addr => {
        if (isValidEthereumAddress(addr)) {
          saveRecentAddress(addr);
        }
      });
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const clearRecentAddresses = () => {
    localStorage.removeItem(RECENT_ADDRESSES_KEY);
    setSuggestions([]);
  };

  // Parse current addresses for validation display
  const currentAddresses = parseAddressSearch(inputValue);
  const hasValidAddresses = currentAddresses.some(addr =>
    isValidEthereumAddress(addr)
  );
  const hasPartialAddresses = currentAddresses.some(addr =>
    isPartialAddressSearch(addr)
  );

  return (
    <div className={cn('relative', className)}>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40' />
        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className='w-full pl-10 pr-10 py-3 glass-dark rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50'
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className='absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-white/40 hover:text-white/70 transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Validation indicators */}
      {inputValue && (
        <div className='flex items-center justify-between mt-1 text-xs'>
          <div className='flex items-center space-x-2'>
            {hasValidAddresses && (
              <span className='text-green-400'>✓ Valid addresses found</span>
            )}
            {hasPartialAddresses && !hasValidAddresses && (
              <span className='text-yellow-400'>
                ⚠ Partial address matching
              </span>
            )}
            {currentAddresses.length > 1 && (
              <span className='text-blue-400'>
                {currentAddresses.length} addresses
              </span>
            )}
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className='absolute top-full left-0 right-0 mt-1 bg-dark-900/95 backdrop-blur-md rounded-lg border border-white/20 shadow-xl z-50 max-h-64 overflow-y-auto'
        >
          <div className='p-2'>
            {/* Recent addresses section */}
            {suggestions.some(s => s.type === 'recent') && (
              <>
                <div className='flex items-center justify-between px-2 py-1 mb-2'>
                  <div className='flex items-center space-x-1 text-xs text-white/60 uppercase tracking-wider'>
                    <Clock className='w-3 h-3' />
                    <span>Recent</span>
                  </div>
                  <button
                    onClick={clearRecentAddresses}
                    className='text-xs text-white/50 hover:text-white/70 transition-colors'
                  >
                    Clear
                  </button>
                </div>
                {suggestions
                  .filter(s => s.type === 'recent')
                  .map((suggestion, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className='w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left'
                    >
                      <Clock className='w-4 h-4 text-white/40 flex-shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-white text-sm font-mono truncate'>
                          {suggestion.address}
                        </p>
                        <p className='text-white/50 text-xs'>
                          {suggestion.timestamp &&
                            new Date(suggestion.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className='w-4 h-4 text-white/30 flex-shrink-0' />
                    </button>
                  ))}
              </>
            )}

            {/* Matching addresses section */}
            {suggestions.some(s => s.type === 'partial') && (
              <>
                {suggestions.some(s => s.type === 'recent') && (
                  <div className='border-t border-white/10 my-2' />
                )}
                <div className='flex items-center space-x-1 px-2 py-1 mb-2 text-xs text-white/60 uppercase tracking-wider'>
                  <MapPin className='w-3 h-3' />
                  <span>Matching Addresses</span>
                </div>
                {suggestions
                  .filter(s => s.type === 'partial')
                  .map((suggestion, index) => (
                    <button
                      key={`match-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className='w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left'
                    >
                      <MapPin className='w-4 h-4 text-white/40 flex-shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-white text-sm font-mono truncate'>
                          {suggestion.address}
                        </p>
                        {suggestion.label && (
                          <p className='text-white/50 text-xs'>
                            {suggestion.label}
                          </p>
                        )}
                      </div>
                      <ArrowRight className='w-4 h-4 text-white/30 flex-shrink-0' />
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <p className='text-xs text-white/50 mt-1'>
        Enter full or partial addresses. Separate multiple addresses with
        commas.
      </p>
    </div>
  );
}
