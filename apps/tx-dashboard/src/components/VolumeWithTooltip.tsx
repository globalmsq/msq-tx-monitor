import React from 'react';
import { formatExactNumber, getTokenDecimals } from '@msq-tx-monitor/msq-common';
import './VolumeWithTooltip.css';

interface VolumeWithTooltipProps {
  formattedValue: string; // The displayed value (e.g., "1.2M")
  rawValue: string | number; // The raw value for tooltip
  tokenSymbol?: string; // Token symbol for decimal conversion
  className?: string; // Additional CSS classes
}

export function VolumeWithTooltip({
  formattedValue,
  rawValue,
  tokenSymbol,
  className = '',
}: VolumeWithTooltipProps) {
  // Get token decimals
  const decimals = tokenSymbol ? getTokenDecimals(tokenSymbol) : 18;

  // Format exact number for tooltip
  const exactNumber = formatExactNumber(rawValue, decimals);
  const tooltipText = tokenSymbol ? `${exactNumber} ${tokenSymbol}` : exactNumber;

  return (
    <span className={`volume-with-tooltip ${className}`}>
      <span className="volume-value">{formattedValue}</span>
      <span className="volume-tooltip">{tooltipText}</span>
    </span>
  );
}