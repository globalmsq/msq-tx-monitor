import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
}

interface TooltipPosition {
  top: number;
  left: number;
  visible: boolean;
}

export function VolumeWithTooltip({
  formattedValue,
  rawValue,
  tokenSymbol,
  className = '',
}: VolumeWithTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    visible: false,
  });
  const containerRef = useRef<HTMLSpanElement>(null);

  // Get token decimals
  const decimals = tokenSymbol ? getTokenDecimals(tokenSymbol) : 18;

  // Format exact number for tooltip
  const exactNumber = formatExactNumber(rawValue, decimals);
  const tooltipText = tokenSymbol
    ? `${exactNumber} ${tokenSymbol}`
    : exactNumber;

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      // Calculate tooltip position above the element, centered
      const left = rect.left + rect.width / 2;
      const top = rect.top - 8; // 8px margin above the element

      setTooltipPosition({
        top,
        left,
        visible: true,
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
        transform: 'translate(-50%, -100%)',
        zIndex: 9999999,
        visibility: 'visible',
        opacity: 1,
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        textAlign: 'center',
        padding: '6px 12px',
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
      {tooltipText}
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
