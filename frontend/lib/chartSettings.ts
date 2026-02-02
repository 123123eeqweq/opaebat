/**
 * Chart Settings - настройки графика
 * Сохраняются в localStorage и применяются ко всем компонентам графика
 */

export interface ChartSettings {
  // Цвета свечей
  bullishColor: string; // Цвет бычьей свечи (растущей)
  bearishColor: string; // Цвет медвежьей свечи (падающей)
  
  // Фоновое изображение
  backgroundImage: string | null; // URL изображения или null
  backgroundOpacity: number; // Прозрачность фона (0-1)
  
  // Метка лайв свечи
  showCountdown: boolean; // Показывать ли метку с таймфреймом и отсчетом
  
  // Сетка
  showGrid: boolean; // Показывать ли сетку на фоне
  
  // Часовой пояс
  timezoneOffset: number; // Смещение от UTC в часах (по умолчанию +2)
}

const DEFAULT_SETTINGS: ChartSettings = {
  bullishColor: '#45b833',
  bearishColor: '#ff3d1f',
  backgroundImage: null,
  backgroundOpacity: 0.3,
  showCountdown: true,
  showGrid: true,
  timezoneOffset: 2, // UTC+2 по умолчанию
};

const STORAGE_KEY = 'chart.settings.v1';

/**
 * Загружает настройки из localStorage
 */
export function loadChartSettings(): ChartSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ChartSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load chart settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Сохраняет настройки в localStorage
 */
export function saveChartSettings(settings: ChartSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save chart settings:', error);
  }
}

/**
 * Получает текущие настройки (синхронно)
 */
export function getChartSettings(): ChartSettings {
  return loadChartSettings();
}
