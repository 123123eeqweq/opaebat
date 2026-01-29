/**
 * DrawingMenu — выпадающее меню инструментов рисования
 * Аналогично IndicatorMenu: одна кнопка, список внутри dropdown
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowRightFromLine, ChevronDown, Minus, Percent, Rows3, SplitSquareVertical, Square, TrendingUp } from 'lucide-react';

export type DrawingModeOption = 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';

interface DrawingMenuProps {
  drawingMode: DrawingModeOption | null;
  onDrawingModeChange: (mode: DrawingModeOption | null) => void;
}

const DRAWING_OPTIONS: { id: DrawingModeOption; label: string; icon: React.ElementType }[] = [
  { id: 'horizontal', label: 'Горизонтальная линия', icon: Minus },
  { id: 'vertical', label: 'Вертикальная линия', icon: SplitSquareVertical },
  { id: 'trend', label: 'Трендовая линия', icon: TrendingUp },
  { id: 'rectangle', label: 'Область (прямоугольник)', icon: Square },
  { id: 'fibonacci', label: 'Фибоначчи', icon: Percent },
  { id: 'parallel-channel', label: 'Параллельный канал', icon: Rows3 },
  { id: 'ray', label: 'Луч', icon: ArrowRightFromLine },
  { id: 'arrow', label: 'Стрелка', icon: ArrowRight },
];

export function DrawingMenu({ drawingMode, onDrawingModeChange }: DrawingMenuProps) {
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

  const handleSelect = (id: DrawingModeOption) => {
    const next = drawingMode === id ? null : id;
    onDrawingModeChange(next);
  };

  const hasActiveTool = drawingMode != null;
  const activeLabel = drawingMode
    ? DRAWING_OPTIONS.find((o) => o.id === drawingMode)?.label ?? 'Рисование'
    : 'Рисование';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
          hasActiveTool
            ? 'bg-[#3347ff] text-white'
            : 'text-gray-300 hover:text-white hover:bg-white/10'
        }`}
        title={activeLabel}
      >
        <span>{activeLabel}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#061230] border border-white/20 rounded-lg shadow-lg min-w-[220px] z-50">
          <div className="p-2">
            {DRAWING_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = drawingMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-[#3347ff]/20 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                  title={opt.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
