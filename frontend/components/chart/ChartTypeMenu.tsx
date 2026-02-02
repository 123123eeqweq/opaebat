/**
 * ChartTypeMenu — выпадающее меню для выбора типа графика
 * Свечи/Линия + режимы свечей (Classic/Heikin Ashi/Bars)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, BarChart3, Gauge, LineChart } from 'lucide-react';
import type { ChartType } from './chart.types';
import type { CandleMode } from './internal/candleModes/candleMode.types';

interface ChartTypeMenuProps {
  chartType: ChartType;
  candleMode: CandleMode;
  onChartTypeChange: (type: ChartType) => void;
  onCandleModeChange: (mode: CandleMode) => void;
}

const CHART_OPTIONS: Array<{
  chartType: ChartType;
  candleMode?: CandleMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { chartType: 'line', label: 'Линия', icon: TrendingUp },
  { chartType: 'candles', candleMode: 'classic', label: 'Свечи', icon: BarChart3 },
  { chartType: 'candles', candleMode: 'bars', label: 'Столбцы', icon: BarChart3 },
  { chartType: 'candles', candleMode: 'heikin_ashi', label: 'Heikin Ashi', icon: Gauge },
];

export function ChartTypeMenu({
  chartType,
  candleMode,
  onChartTypeChange,
  onCandleModeChange,
}: ChartTypeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center text-white hover:bg-white/10"
        title="Тип графика"
        style={{ width: '44px', height: '36px', minWidth: '44px', maxWidth: '44px' }}
      >
        <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-lg shadow-xl z-50 overflow-hidden bg-[#1a2438] border border-white/5">
          <div className="p-2 flex items-center gap-1.5">
            {CHART_OPTIONS.map((option) => {
              const isActive =
                option.chartType === chartType &&
                (option.candleMode === candleMode ||
                  (!option.candleMode && candleMode === 'classic'));
              const Icon = option.icon;
              
              return (
                <button
                  key={`${option.chartType}-${option.candleMode || 'classic'}`}
                  type="button"
                  onClick={() => {
                    onChartTypeChange(option.chartType);
                    if (option.candleMode) {
                      onCandleModeChange(option.candleMode);
                    } else if (option.chartType === 'candles') {
                      onCandleModeChange('classic');
                    }
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors flex-1 min-w-0 ${
                    isActive
                      ? 'bg-[#3347ff]/35 text-white border border-[#3347ff]/50'
                      : 'bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium whitespace-nowrap">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
