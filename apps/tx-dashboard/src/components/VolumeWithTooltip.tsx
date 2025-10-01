import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  formatExactNumber,
  getTokenDecimals,
} from '@msq-tx-monitor/msq-common';
import './VolumeWithTooltip.css';

interface VolumeWithTooltipProps {
  formattedValue: string; // The displayed value (e.g., "1.2M")
  rawValue: string | number; // The raw value for tooltip
  tokenSymbol?: string; // Token symbol for decimal conversion
  className?: string; // Additional CSS classes
  receivedValue?: string; // Raw received value for breakdown
  sentValue?: string; // Raw sent value for breakdown
  showBreakdown?: boolean; // Whether to show received/sent breakdown
}

interface TooltipPosition {
  top: number;
  left: number;
  visible: boolean;
  alignment: 'left' | 'center' | 'right';
}

export function VolumeWithTooltip({
  formattedValue,
  rawValue,
  tokenSymbol,
  className = '',
  receivedValue,
  sentValue,
  showBreakdown = false,
}: VolumeWithTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    visible: false,
    alignment: 'center',
  });
  const containerRef = useRef<HTMLSpanElement>(null);

  // Get token decimals
  const decimals = tokenSymbol ? getTokenDecimals(tokenSymbol) : 18;

  // Format exact number for tooltip
  const exactNumber = formatExactNumber(rawValue, decimals);
  const tooltipText = tokenSymbol
    ? `${exactNumber} ${tokenSymbol}`
    : exactNumber;

  // Format breakdown values if provided
  const formattedReceived = receivedValue
    ? formatExactNumber(receivedValue, decimals)
    : '0';
  const formattedSent = sentValue ? formatExactNumber(sentValue, decimals) : '0';

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      // Calculate tooltip position above the element
      const estimatedTooltipWidth = showBreakdown ? 280 : 200;
      let left = rect.left + rect.width / 2;
      let alignment: 'left' | 'center' | 'right' = 'center';
      const top = rect.top - 8; // 8px margin above the element

      // Check left boundary - align to left edge if tooltip would overflow
      if (left - estimatedTooltipWidth / 2 < 10) {
        left = rect.left;
        alignment = 'left';
      }
      // Check right boundary - align to right edge if tooltip would overflow
      else if (left + estimatedTooltipWidth / 2 > window.innerWidth - 10) {
        left = rect.right;
        alignment = 'right';
      }

      setTooltipPosition({
        top,
        left,
        visible: true,
        alignment,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipPosition(prev => ({
      ...prev,
      visible: false,
    }));
  };

  // Create tooltip element
  const tooltip = tooltipPosition.visible ? (
    <div
      className='volume-tooltip-portal'
      style={{
        position: 'fixed',
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        transform:
          tooltipPosition.alignment === 'left'
            ? 'translate(0, -100%)'
            : tooltipPosition.alignment === 'right'
            ? 'translate(-100%, -100%)'
            : 'translate(-50%, -100%)',
        zIndex: 9999999,
        visibility: 'visible',
        opacity: 1,
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        textAlign: showBreakdown ? 'left' : 'center',
        padding: showBreakdown ? '8px 12px' : '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontWeight: '500',
        letterSpacing: '0.025em',
      }}
    >
      {showBreakdown ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: '600', fontSize: '13px' }}>
            {tooltipText}
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              margin: '2px 0',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#60a5fa',
            }}
          >
            <ArrowDown size={12} />
            <span>
              recv: {formattedReceived}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#fb923c',
            }}
          >
            <ArrowUp size={12} />
            <span>
              sent: {formattedSent}
            </span>
          </div>
        </div>
      ) : (
        tooltipText
      )}
      {/* Arrow pointing down */}
      <div
        style={{
          content: '',
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '5px',
          borderStyle: 'solid',
          borderColor: '#1a1a1a transparent transparent transparent',
        }}
      />
    </div>
  ) : null;

  return (
    <>
      <span
        ref={containerRef}
        className={`volume-with-tooltip ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'help', display: 'inline-block' }}
      >
        {formattedValue}
      </span>
      {tooltip && createPortal(tooltip, document.body)}
    </>
  );
}
