/**
 * IndicatorMenu - меню для управления индикаторами
 * 
 * Позволяет включать/выключать каждый индикатор отдельно
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { IndicatorConfig } from './internal/indicators/indicator.types';

interface IndicatorMenuProps {
  indicatorConfigs: IndicatorConfig[];
  onConfigChange: (configs: IndicatorConfig[]) => void;
}

export function IndicatorMenu({ indicatorConfigs, onConfigChange }: IndicatorMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне его
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

  // Проверяем, есть ли хотя бы один включенный индикатор
  const hasEnabledIndicators = indicatorConfigs.some(c => c.enabled);

  const handleToggleIndicator = (id: string) => {
    const newConfigs = indicatorConfigs.map(config => 
      config.id === id 
        ? { ...config, enabled: !config.enabled }
        : config
    );
    onConfigChange(newConfigs);
  };

  const getIndicatorLabel = (config: IndicatorConfig): string => {
    if (config.type === 'Stochastic') {
      return `Stochastic(${config.period},${config.periodD ?? 3})`;
    }
    if (config.type === 'BollingerBands') {
      return `Боллинджер(${config.period}, ${config.stdDevMult ?? 2})`;
    }
    return `${config.type}(${config.period})`;
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Кнопка открытия меню */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
          hasEnabledIndicators
            ? 'bg-green-600 text-white'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
      >
        <span>Индикаторы</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#061230] border border-white/20 rounded-lg shadow-lg min-w-[200px] z-50">
          <div className="p-2">
            {indicatorConfigs.map((config) => (
              <label
                key={config.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.enabled || false}
                  onChange={() => handleToggleIndicator(config.id)}
                  className="w-4 h-4 rounded border-white/20 bg-transparent text-[#3347ff] focus:ring-2 focus:ring-[#3347ff] focus:ring-offset-0"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm text-gray-300">
                    {getIndicatorLabel(config)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
