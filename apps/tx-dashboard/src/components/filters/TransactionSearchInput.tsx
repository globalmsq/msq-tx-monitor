import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, MapPin, ArrowRight, Hash } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  isValidEthereumAddress,
  isPartialAddressSearch,
  parseAddressSearch,
  isValidTransactionHash,
  isPartialTransactionHash,
  getSearchType,
} from '../../utils/filterUtils';

interface TransactionSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  address: string;
  type: 'recent' | 'partial';
  searchType?: 'address' | 'hash' | 'partial' | 'unknown';
  label?: string;
  timestamp?: number;
}

const RECENT_SEARCHES_KEY = 'msq-tx-monitor-recent-searches';
const MAX_RECENT_SEARCHES = 10;

// Mock function to simulate getting matches from transaction history
// In a real app, this would query your transaction database
function getMockSearchMatches(query: string): SearchSuggestion[] {
  const queryType = getSearchType(query);

  // Mock data based on search type
  const mockAddresses = [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x1234567890abcdef1234567890abcdef87654321',
    '0x12345678901234567890123456789012abcdef12',
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0xfedcba0987654321fedcba0987654321fedcba09',
  ];

  const mockHashes = [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef34',
    '0x12345678901234567890123456789012345678901234567890123456789012ab',
  ];

  if (query.length < 3) return [];

  let matches: SearchSuggestion[] = [];

  // Search addresses
  if (
    queryType === 'address' ||
    queryType === 'partial' ||
    queryType === 'unknown'
  ) {
    matches = matches.concat(
      mockAddresses
        .filter(addr => addr.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(address => ({
          address,
          type: 'partial' as const,
          searchType: 'address' as const,
          label: `${address.slice(0, 8)}...${address.slice(-6)}`,
        }))
    );
  }

  // Search transaction hashes
  if (
    queryType === 'hash' ||
    queryType === 'partial' ||
    (queryType === 'unknown' && query.length > 10)
  ) {
    matches = matches.concat(
      mockHashes
        .filter(hash => hash.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .map(address => ({
          address,
          type: 'partial' as const,
          searchType: 'hash' as const,
          label: `${address.slice(0, 10)}...${address.slice(-8)}`,
        }))
    );
  }

  return matches.slice(0, 5);
}

function getRecentSearches(): SearchSuggestion[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(searchValue: string) {
  try {
    const recent = getRecentSearches();
    const searchType = getSearchType(searchValue);
    const filtered = recent.filter(item => item.address !== searchValue);

    const updated = [
      {
        address: searchValue,
        type: 'recent' as const,
        searchType,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT_SEARCHES);

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
}

export function TransactionSearchInput({
  value,
  onChange,
  placeholder = 'Search by address or tx hash...',
  className,
}: TransactionSearchInputProps) {
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
      setSuggestions(getRecentSearches());
      return;
    }

    // Parse multiple search terms
    const searchTerms = parseAddressSearch(inputValue);
    const lastTerm = searchTerms[searchTerms.length - 1];

    if (lastTerm && lastTerm.length >= 3) {
      const matches = getMockSearchMatches(lastTerm);
      const recent = getRecentSearches().filter(item =>
        item.address.toLowerCase().includes(lastTerm.toLowerCase())
      );
      setSuggestions([...recent.slice(0, 3), ...matches]);
    } else {
      setSuggestions(getRecentSearches());
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
    const searchTerms = parseAddressSearch(inputValue);

    if (searchTerms.length > 1) {
      // Replace the last search term with the suggestion
      const newTerms = [...searchTerms.slice(0, -1), suggestion.address];
      const newValue = newTerms.join(', ');
      setInputValue(newValue);
      onChange(newValue);
    } else {
      setInputValue(suggestion.address);
      onChange(suggestion.address);
    }

    if (
      suggestion.type === 'partial' &&
      (isValidEthereumAddress(suggestion.address) ||
        isValidTransactionHash(suggestion.address))
    ) {
      saveRecentSearch(suggestion.address);
    }

    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(inputValue);
      setIsOpen(false);

      // Save valid search terms to recent
      const searchTerms = parseAddressSearch(inputValue);
      searchTerms.forEach(term => {
        if (isValidEthereumAddress(term) || isValidTransactionHash(term)) {
          saveRecentSearch(term);
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

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setSuggestions([]);
  };

  // Parse current search terms for validation display
  const currentSearchTerms = parseAddressSearch(inputValue);
  const hasValidTerms = currentSearchTerms.some(
    term => isValidEthereumAddress(term) || isValidTransactionHash(term)
  );
  const hasPartialTerms = currentSearchTerms.some(
    term => isPartialAddressSearch(term) || isPartialTransactionHash(term)
  );

  // Get search type breakdown
  const searchTypes = currentSearchTerms.map(term => getSearchType(term));
  const hasAddresses = searchTypes.some(type => type === 'address');
  const hasHashes = searchTypes.some(type => type === 'hash');

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
            {hasValidTerms && (
              <div className='flex items-center space-x-1'>
                <span className='text-green-400'>✓ Valid</span>
                {hasAddresses && (
                  <span className='text-green-400 flex items-center'>
                    <MapPin className='w-3 h-3 mr-1' />
                    addresses
                  </span>
                )}
                {hasHashes && (
                  <span className='text-green-400 flex items-center'>
                    <Hash className='w-3 h-3 mr-1' />
                    hashes
                  </span>
                )}
                <span className='text-green-400'>found</span>
              </div>
            )}
            {hasPartialTerms && !hasValidTerms && (
              <span className='text-yellow-400'>⚠ Partial matching</span>
            )}
            {currentSearchTerms.length > 1 && (
              <span className='text-blue-400'>
                {currentSearchTerms.length} search terms
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
                    onClick={clearRecentSearches}
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
                      <div className='flex items-center space-x-2 flex-shrink-0'>
                        <Clock className='w-4 h-4 text-white/40' />
                        {suggestion.searchType === 'hash' && (
                          <Hash className='w-3 h-3 text-blue-400' />
                        )}
                        {suggestion.searchType === 'address' && (
                          <MapPin className='w-3 h-3 text-green-400' />
                        )}
                      </div>
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
                      <div className='flex items-center space-x-2 flex-shrink-0'>
                        {suggestion.searchType === 'hash' ? (
                          <Hash className='w-4 h-4 text-blue-400' />
                        ) : (
                          <MapPin className='w-4 h-4 text-green-400' />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-white text-sm font-mono truncate'>
                          {suggestion.address}
                        </p>
                        {suggestion.label && (
                          <p className='text-white/50 text-xs'>
                            {suggestion.searchType === 'hash'
                              ? 'Transaction Hash'
                              : 'Address'}{' '}
                            - {suggestion.label}
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
        Enter addresses (42 chars) or transaction hashes (66 chars). Separate
        multiple terms with commas.
      </p>
    </div>
  );
}
