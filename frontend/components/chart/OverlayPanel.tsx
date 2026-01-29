/**
 * FLOW O4 — Overlay Panel UI (React)
 * Панель активных объектов: название, глаз (показать/скрыть), крест (удалить).
 * Обычный React UI, НЕ canvas. Связь только через Overlay Registry.
 */

'use client';

import { Eye, EyeOff, X } from 'lucide-react';
import type { Overlay } from './internal/overlay/overlay.types';

interface OverlayPanelProps {
  overlays: Overlay[];
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function OverlayPanel({
  overlays,
  onToggleVisibility,
  onRemove,
  className = '',
}: OverlayPanelProps) {
  if (overlays.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-[#061230]/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg min-w-[220px] max-h-[280px] overflow-y-auto ${className}`}
      role="list"
      aria-label="Активные объекты на графике"
    >
      <div className="p-2 space-y-0.5">
        {overlays.map((overlay) => (
          <div
            key={overlay.id}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 group"
            role="listitem"
          >
            <span className="flex-1 text-sm text-gray-200 truncate" title={overlay.name}>
              {overlay.name}
            </span>
            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onToggleVisibility(overlay.id)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title={overlay.visible ? 'Скрыть' : 'Показать'}
                aria-label={overlay.visible ? 'Скрыть' : 'Показать'}
              >
                {overlay.visible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(overlay.id)}
                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                title="Удалить"
                aria-label="Удалить"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
