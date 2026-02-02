'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Bitcoin,
  Landmark,
  Check,
  Receipt,
  ArrowRight,
  Lock,
  Search,
  UserCog,
  ArrowUpSquare,
  Monitor,
  BarChart2,
  GraduationCap,
  Shield,
  ChevronRight,
  User,
  Pencil,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  Save,
  Calendar,
  AlertTriangle,
  Upload,
  FileText,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Trophy,
  UserCircle,
  Wallet,
  TrendingUp,
  MessageCircle,
  KeyRound,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api/api';

type ProfileTab = 'profile' | 'wallet' | 'trade' | 'support' | 'security' | 'education';
type PaymentMethod = 'card' | 'crypto' | 'bank';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  // 🔥 FLOW S3: Two-Factor Authentication
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string[];
}

const QUICK_AMOUNTS = [100, 250, 1000, 5000];

const HELP_TOPICS = [
  {
    id: 'account',
    title: 'Управление аккаунтом',
    description: 'Верификация, детали профиля, сброс пароля и настройки безопасности аккаунта.',
    icon: UserCog,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'deposits',
    title: 'Пополнение и вывод',
    description: 'Способы оплаты, время обработки, лимиты транзакций и решение проблем.',
    icon: ArrowUpSquare,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'trading',
    title: 'Графики и инструменты',
    description: 'Работа с графиками, индикаторы, инструменты рисования, настройка отображения и анализ рынка.',
    icon: Monitor,
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    id: 'markets',
    title: 'Рынки и инструменты',
    description: 'Форекс, акции, товары, спреды, торговые часы и требования к марже.',
    icon: BarChart2,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    id: 'education',
    title: 'Обучение и глоссарий',
    description: 'Торговые руководства, терминология, вебинары и учебные материалы по анализу рынка.',
    icon: GraduationCap,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'security',
    title: 'Безопасность и конфиденциальность',
    description: 'Настройка 2FA, политика конфиденциальности, сообщение о подозрительной активности и защита данных.',
    icon: Shield,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
  },
];

interface TabProfileProps {
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

function TabProfile({ profile, onProfileUpdate }: TabProfileProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerValue, setDatePickerValue] = useState<string>(''); // Для нативного date input (YYYY-MM-DD)
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  
  // Заполняем поля из профиля при изменении
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setNickname(profile.nickname || '');
      setCountry(profile.country || '');
      setPhone(profile.phone || '');
      
      // 🔥 FLOW U1.1: Форматируем дату рождения для отображения и date picker
      if (profile.dateOfBirth) {
        const date = new Date(profile.dateOfBirth);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDob(`${day}.${month}.${year}`);
        // Для нативного date input нужен формат YYYY-MM-DD
        setDatePickerValue(`${year}-${month}-${day}`);
      } else {
        setDob('');
        setDatePickerValue('');
      }
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      // 🔥 FLOW U1.1: Форматируем дату рождения из DD.MM.YYYY в ISO формат YYYY-MM-DD
      let dateOfBirth: string | null | undefined;
      if (dob && dob.trim()) {
        const parts = dob.trim().split('.');
        if (parts.length === 3) {
          const [day, month, year] = parts.map(p => p.trim());
          // Валидация: проверяем, что все части - числа
          if (day && month && year && 
              /^\d+$/.test(day) && /^\d+$/.test(month) && /^\d+$/.test(year) &&
              day.length <= 2 && month.length <= 2 && year.length === 4) {
            // Форматируем с ведущими нулями
            const dayPadded = day.padStart(2, '0');
            const monthPadded = month.padStart(2, '0');
            dateOfBirth = `${year}-${monthPadded}-${dayPadded}`;
            
            // Дополнительная валидация: проверяем, что дата валидна
            const dateObj = new Date(dateOfBirth);
            if (isNaN(dateObj.getTime())) {
              alert('Invalid date format. Please use DD.MM.YYYY');
              setSaving(false);
              return;
            }
          } else {
            alert('Invalid date format. Please use DD.MM.YYYY (e.g., 12.05.1998)');
            setSaving(false);
            return;
          }
        } else {
          alert('Invalid date format. Please use DD.MM.YYYY (e.g., 12.05.1998)');
          setSaving(false);
          return;
        }
      } else {
        // Если поле пустое, отправляем null для очистки даты
        dateOfBirth = null;
      }

      const updateData: {
        firstName?: string | null;
        lastName?: string | null;
        nickname?: string | null;
        phone?: string | null;
        country?: string | null;
        dateOfBirth?: string | null;
      } = {};

      // 🔥 FLOW U1.1: Отправляем все поля, включая null для очистки
      if (firstName !== undefined) updateData.firstName = firstName || null;
      if (lastName !== undefined) updateData.lastName = lastName || null;
      if (nickname !== undefined) updateData.nickname = nickname || null;
      if (phone !== undefined) updateData.phone = phone || null;
      if (country !== undefined) updateData.country = country || null;
      // dateOfBirth всегда отправляется (даже если null) для обновления/очистки
      // Формат: YYYY-MM-DD (ISO date string) или null
      updateData.dateOfBirth = dateOfBirth;

      const response = await api<{ user: UserProfile }>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const updatedProfile = response.user;
      onProfileUpdate(updatedProfile);
      
      // Обновляем локальные состояния
      setFirstName(updatedProfile.firstName || '');
      setLastName(updatedProfile.lastName || '');
      setNickname(updatedProfile.nickname || '');
      setCountry(updatedProfile.country || '');
      setPhone(updatedProfile.phone || '');
      
      // 🔥 FLOW U1.1: Обновляем отображаемую дату и date picker значение
      if (updatedProfile.dateOfBirth) {
        const date = new Date(updatedProfile.dateOfBirth);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setDob(`${day}.${month}.${year}`);
        setDatePickerValue(`${year}-${month}-${day}`);
      } else {
        setDob('');
        setDatePickerValue('');
      }
      
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      
      // 🔥 FLOW U1.1: Обработка ошибок валидации dateOfBirth
      if (error?.response?.status === 400 && error?.response?.data?.message) {
        const errorMessage = error.response.data.message;
        if (errorMessage.includes('at least 18 years old')) {
          alert('You must be at least 18 years old to use this service.');
        } else if (errorMessage.includes('cannot be in the future')) {
          alert('Date of birth cannot be in the future.');
        } else if (errorMessage.includes('Invalid date of birth')) {
          alert(errorMessage);
        } else {
          alert(`Error: ${errorMessage}`);
        }
      } else {
        alert(error instanceof Error ? error.message : 'Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  // Проверка, заполнено ли поле (для зеленой обводки)
  const isFieldFilled = (value: string | null | undefined) => {
    return value !== null && value !== undefined && value.trim() !== '';
  };

  // 🔥 FLOW U1.9: Обработчик удаления аккаунта
  const handleDeleteAccount = async () => {
    // Показываем confirm диалог
    const confirmed = window.confirm(
      '⚠️ This action is irreversible!\n\n' +
      'All your data will be permanently deleted:\n' +
      '- Your profile\n' +
      '- All trades\n' +
      '- All accounts\n' +
      '- All sessions\n\n' +
      'Are you absolutely certain you want to delete your account?'
    );

    if (!confirmed) {
      return;
    }

    // Показываем модальное окно для ввода пароля
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword || deletePassword.length < 8) {
      alert('Please enter your password (minimum 8 characters)');
      return;
    }

    try {
      setDeleting(true);

      // Вызываем DELETE /api/user/profile
      await api<{ message: string }>('/api/user/profile', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });

      // Успешно удалено - редирект на главную страницу
      alert('Your account has been deleted successfully.');
      router.push('/');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      
      // Обработка ошибок
      if (error?.response?.status === 401) {
        alert('Invalid password. Please try again.');
        setDeletePassword('');
      } else if (error?.response?.status === 404) {
        alert('User not found. Please refresh the page.');
      } else {
        alert(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="text-gray-400">Загрузка профиля...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Personal Data */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3347ff]/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#3347ff]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Личные данные</h3>
                <p className="text-sm text-gray-400">Управляйте вашей личной информацией и данными профиля.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#3347ff] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#3347ff]/90 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-[#3347ff] uppercase tracking-wider mb-3 pb-1 border-b border-[#3347ff]/30">
                Основная информация
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Имя</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 ${
                          isFieldFilled(firstName) ? 'border-emerald-500/50' : 'border-white/20'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Фамилия</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Введите фамилию"
                        className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 ${
                          isFieldFilled(lastName) ? 'border-emerald-500/50' : 'border-white/20'
                        }`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Никнейм</label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="@ никнейм"
                        className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 ${
                          isFieldFilled(nickname) ? 'border-emerald-500/50' : 'border-white/20'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Дата рождения</label>
                      <div className="relative">
                        {/* Отображаемое поле с форматом DD.MM.YYYY */}
                        <input
                          type="text"
                          value={dob}
                          readOnly
                          onClick={() => setShowDatePicker(true)}
                          placeholder="DD.MM.YYYY"
                          className={`w-full px-3 py-2 pr-10 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 cursor-pointer ${
                            isFieldFilled(dob) ? 'border-emerald-500/50' : 'border-white/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(true)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        
                        {/* Скрытый нативный date input для календаря */}
                        {showDatePicker && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowDatePicker(false)}
                            />
                            <div className="absolute top-full left-0 mt-2 z-50 bg-[#061230] border border-white/20 rounded-lg shadow-lg p-3">
                              <input
                                type="date"
                                value={datePickerValue}
                                onChange={(e) => {
                                  const selectedDate = e.target.value;
                                  if (selectedDate) {
                                    // 🔥 FLOW U1.1: Конвертируем YYYY-MM-DD в DD.MM.YYYY
                                    const [year, month, day] = selectedDate.split('-');
                                    setDob(`${day}.${month}.${year}`);
                                    setDatePickerValue(selectedDate);
                                  } else {
                                    setDob('');
                                    setDatePickerValue('');
                                  }
                                  setShowDatePicker(false);
                                }}
                                max={new Date().toISOString().split('T')[0]} // Максимальная дата - сегодня
                                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                                autoFocus
                                onBlur={() => {
                                  // Закрываем календарь при потере фокуса (с небольшой задержкой для обработки клика)
                                  setTimeout(() => setShowDatePicker(false), 200);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  // Очистить дату
                                  setDob('');
                                  setDatePickerValue('');
                                  setShowDatePicker(false);
                                }}
                                className="mt-2 w-full px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#3347ff] uppercase tracking-wider mb-3 pb-1 border-b border-[#3347ff]/30">
                Детали местоположения
              </h4>
              {profile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Страна</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 ${
                        isFieldFilled(country) ? 'border-emerald-500/50' : 'border-white/20'
                      }`}
                    >
                      <option value="" className="bg-[#0a1635]">Выберите страну</option>
                      <option value="Ukraine" className="bg-[#0a1635]">Украина</option>
                      <option value="Russia" className="bg-[#0a1635]">Россия</option>
                      <option value="Other" className="bg-[#0a1635]">Другое</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Номер телефона</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+380991234567"
                      className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 ${
                        isFieldFilled(phone) ? 'border-emerald-500/50' : 'border-white/20'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification — остаётся на вкладке Профиль */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Check className="w-5 h-5 text-[#3347ff]" />
              Верификация
            </h3>
            <span className="text-sm text-gray-400">Шаг 2 из 3</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Подтверждение Email</p>
                <p className="text-xs text-gray-400">Завершено 24 окт</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#3347ff] flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white mb-3">Проверка личности</p>
                <button
                  type="button"
                  className="w-full py-4 px-4 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center gap-2 text-gray-400 hover:border-[#3347ff]/50 hover:text-[#3347ff] transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Загрузить паспорт или ID</span>
                </button>
                <p className="text-xs text-gray-500 mt-2">Макс. размер 5MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Language Selection & Delete Account */}
        <div className="space-y-6 mt-8">
          {/* Language Selection */}
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🌐</span>
              Язык
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { code: 'en', name: 'English', flag: '🇬🇧' },
                { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                { code: 'uk', name: 'Українська', flag: '🇺🇦' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
                { code: 'es', name: 'Español', flag: '🇪🇸' },
                { code: 'it', name: 'Italiano', flag: '🇮🇹' },
                { code: 'pt', name: 'Português', flag: '🇵🇹' },
                { code: 'zh', name: '中文', flag: '🇨🇳' },
                { code: 'ja', name: '日本語', flag: '🇯🇵' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#3347ff]/50 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{lang.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{lang.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delete Account */}
          <div className="rounded-xl bg-[#0a1635] border border-red-500/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Удалить аккаунт
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  После удаления аккаунта вернуть его будет невозможно. Пожалуйста, будьте уверены.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-6 py-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500 transition-colors font-medium text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 FLOW U1.9: Модальное окно для подтверждения удаления с паролем */}
      {showDeleteModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!deleting) {
                setShowDeleteModal(false);
                setDeletePassword('');
              }
            }}
          >
            <div 
              className="bg-[#0a1635] border border-red-500/30 rounded-xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Удалить аккаунт</h3>
                  <p className="text-sm text-gray-400">Это действие нельзя отменить</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-4">
                  Для подтверждения удаления аккаунта введите ваш пароль:
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Введите ваш пароль"
                  disabled={deleting}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !deleting && deletePassword.length >= 8) {
                      confirmDeleteAccount();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!deleting) {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAccount}
                  disabled={deleting || deletePassword.length < 8}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    'Удалить аккаунт'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function TabWallet() {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [amount, setAmount] = useState<string>('1000');
  const [promo, setPromo] = useState<string>('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const amountNum = parseFloat(amount.replace(/\s/g, '')) || 0;
  const fee = 0;
  const total = amountNum + fee;

  // 🔥 FLOW W1: Загрузка баланса
  const loadBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const response = await api<{ currency: string; balance: number }>('/api/wallet/balance');
      setBalance(response.balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // 🔥 FLOW W1: Обработчик депозита
  const handleDeposit = async () => {
    if (amountNum < 10) {
      alert('Minimum deposit is $10');
      return;
    }

    if (amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setDepositing(true);

      // Маппинг метода оплаты
      const paymentMethodMap: Record<PaymentMethod, 'CARD' | 'CRYPTO' | 'BANK'> = {
        card: 'CARD',
        crypto: 'CRYPTO',
        bank: 'BANK',
      };

      const response = await api<{
        transactionId: string;
        status: string;
        amount: number;
        currency: string;
      }>('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod: paymentMethodMap[method],
        }),
      });

      // Успешный депозит
      alert(`Deposit successful! Transaction ID: ${response.transactionId}`);
      
      // Обновляем баланс
      await loadBalance();
      
      // Очищаем форму
      setAmount('1000');
      setPromo('');
    } catch (error: any) {
      console.error('Failed to deposit:', error);
      
      if (error?.response?.status === 400) {
        alert(error?.response?.data?.message || error.message || 'Failed to process deposit');
      } else {
        alert(error instanceof Error ? error.message : 'Failed to process deposit. Please try again.');
      }
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Пополнить счет</h2>
        <p className="text-gray-400 mt-1">
          Выберите способ оплаты и введите сумму для безопасного пополнения.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <section className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3347ff] flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-lg font-semibold text-white">Выберите способ оплаты</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setMethod('card')}
                disabled={depositing}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'card' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                } ${depositing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {method === 'card' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <CreditCard className="w-10 h-10 text-[#3347ff] mb-2" />
                <span className="font-semibold text-white">Оплата картой</span>
                <span className="text-sm text-gray-400">Мгновенно • Без комиссии</span>
                <div className="flex gap-2 mt-2">
                  <div className="w-10 h-6 rounded bg-white/20" />
                  <div className="w-10 h-6 rounded bg-white/20" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                disabled={depositing}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'crypto' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                } ${depositing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {method === 'crypto' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Bitcoin className="w-10 h-10 text-amber-500 mb-2" />
                <span className="font-semibold text-white">Криптовалюта</span>
                <span className="text-sm text-gray-400">BTC, ETH, USDT</span>
                <div className="flex gap-1.5 mt-2">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">TRC20</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">ERC20</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank')}
                disabled={depositing}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'bank' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                } ${depositing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {method === 'bank' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Landmark className="w-10 h-10 text-violet-400 mb-2" />
                <span className="font-semibold text-white">Банковский перевод</span>
                <span className="text-sm text-gray-400">1-3 рабочих дня</span>
                <span className="text-sm text-gray-500 mt-2">SWIFT / SEPA</span>
              </button>
            </div>
          </section>
          <section className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3347ff] flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-lg font-semibold text-white">Enter Amount</h3>
            </div>
            <div className="space-y-4">
              <label className="block text-xs uppercase tracking-wider text-gray-400">Сумма пополнения (USD)</label>
              <div className="flex border border-white/20 rounded-lg overflow-hidden bg-white/5">
                <span className="px-4 py-3 text-gray-400 border-r border-white/20">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))}
                  className="flex-1 px-4 py-3 bg-transparent text-white placeholder-gray-500 min-w-0"
                  placeholder="0"
                  disabled={depositing}
                />
                <span className="px-4 py-3 text-gray-400 border-l border-white/20">USD</span>
              </div>
              {amountNum > 0 && amountNum < 10 && (
                <p className="text-xs text-amber-400 mt-1">Минимальная сумма пополнения $10</p>
              )}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amountNum === n ? 'bg-[#3347ff] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    ${n.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Промокод (необязательно)"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm"
                />
                <button type="button" className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors">
                  Применить
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="lg:w-96 shrink-0 space-y-4">
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Сводка</h3>
              <Receipt className="w-5 h-5 text-gray-400" />
            </div>
            <dl className="space-y-3 text-sm">
              {/* 🔥 FLOW W1: Текущий баланс */}
              <div className="flex justify-between pb-2 border-b border-white/10">
                <dt className="text-gray-400">Текущий баланс</dt>
                <dd className="text-white font-semibold">
                  {loadingBalance ? (
                    <RefreshCw className="w-4 h-4 animate-spin inline-block" />
                  ) : balance !== null ? (
                    `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Способ</dt>
                <dd className="text-white">
                  {method === 'card' && 'VISA **** 4242'}
                  {method === 'crypto' && 'Криптовалюта (USDT)'}
                  {method === 'bank' && 'Банковский перевод'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Сумма</dt>
                <dd className="text-white">${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Комиссия</dt>
                <dd className="text-emerald-400">Бесплатно</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <dt className="text-gray-400 font-medium">Итого к оплате</dt>
                <dd className="text-[#3347ff] font-bold text-lg">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={handleDeposit}
              disabled={depositing || amountNum < 10 || amountNum <= 0}
              className="w-full mt-4 py-3 px-4 rounded-lg bg-[#3347ff] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#3347ff]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {depositing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Подтвердить пополнение
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Нажимая "Подтвердить", вы соглашаетесь с{' '}
              <Link href="/policy/terms" className="text-[#3347ff] hover:underline">Условиями использования</Link>.
            </p>
          </div>
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Безопасный платеж</h4>
              <p className="text-sm text-gray-400 mt-0.5">256-битное SSL шифрование. Ваши данные в безопасности.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabSecurityProps {
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

function TabSecurity({ profile, onProfileUpdate: _onProfileUpdate }: TabSecurityProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // 🔥 FLOW S1: Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 🔥 FLOW S3: 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // 🔥 FLOW S1: Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const response = await api<{ sessions: Session[] }>('/api/user/sessions');
      // Сортируем: сначала активные (не истекшие), потом по дате создания (новые первыми)
      const now = new Date();
      const sortedSessions = response.sessions.sort((a, b) => {
        const aExpired = new Date(a.expiresAt) < now;
        const bExpired = new Date(b.expiresAt) < now;
        // Активные сессии идут первыми
        if (aExpired !== bExpired) {
          return aExpired ? 1 : -1;
        }
        // Среди активных/истекших сортируем по дате создания (новые первыми)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setSessions(sortedSessions);
      // Текущая сессия - самая последняя активная (не истекшая) сессия
      const activeSession = sortedSessions.find(s => new Date(s.expiresAt) >= now);
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
      } else if (sortedSessions.length > 0) {
        // Если все сессии истекли, берем самую последнюю
        setCurrentSessionId(sortedSessions[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      const errorMsg = error?.response?.data?.message || 'Не удалось загрузить список сессий';
      alert(errorMsg);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    // 🔥 FLOW S3: Load 2FA status
    if (profile) {
      setTwoFactorEnabled(profile.twoFactorEnabled || false);
    }
  }, [loadSessions, profile]);

  // 🔥 FLOW S1: Revoke specific session
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Вы уверены, что хотите завершить эту сессию?')) {
      return;
    }

    try {
      setRevokingSessionId(sessionId);
      await api(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      alert('Сессия успешно завершена');
      await loadSessions();
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      alert(error?.response?.data?.message || 'Не удалось завершить сессию');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // 🔥 FLOW S2: Revoke all other sessions
  const handleRevokeOtherSessions = async () => {
    if (!confirm('Вы уверены, что хотите завершить все остальные сессии?')) {
      return;
    }

    try {
      setRevokingOthers(true);
      await api('/api/user/sessions/others', {
        method: 'DELETE',
      });
      alert('Все остальные сессии успешно завершены');
      await loadSessions();
    } catch (error: any) {
      console.error('Failed to revoke other sessions:', error);
      alert(error?.response?.data?.message || 'Не удалось завершить сессии');
    } finally {
      setRevokingOthers(false);
    }
  };

  // Helper: Parse user agent to get device/browser info
  const parseUserAgent = (userAgent: string | null | undefined): { device: string; browser: string } => {
    if (!userAgent) {
      return { device: 'Неизвестное устройство', browser: 'Неизвестный браузер' };
    }

    const ua = userAgent.toLowerCase();
    let device = 'Неизвестное устройство';
    let browser = 'Неизвестный браузер';

    // Device detection
    if (ua.includes('windows')) device = 'Windows';
    else if (ua.includes('mac')) device = 'macOS';
    else if (ua.includes('linux')) device = 'Linux';
    else if (ua.includes('android')) device = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) device = ua.includes('iphone') ? 'iPhone' : 'iPad';

    // Browser detection
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    return { device, browser };
  };

  // Helper: Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Сейчас';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`;
    
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || currentPassword.length < 8) {
      alert('Please enter your current password (minimum 8 characters)');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      alert('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      alert('New password must be different from current password');
      return;
    }
    try {
      setChangingPassword(true);
      await api<{ message: string }>('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error?.response?.status === 400) {
        const msg = error?.response?.data?.message || error.message;
        alert(msg.includes('Current password') ? 'Current password is incorrect.' : msg);
      } else {
        alert(error instanceof Error ? error.message : 'Failed to change password.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // 🔥 FLOW S3: Enable 2FA (step 1 - generate QR code)
  const handleEnable2FA = async () => {
    try {
      setEnabling2FA(true);
      const response = await api<{ qrCode: string; backupCodes: string[] }>('/api/user/2fa/enable', {
        method: 'POST',
      });
      setQrCode(response.qrCode);
      setBackupCodes(response.backupCodes);
      setShow2FAModal(true);
    } catch (error: any) {
      console.error('Failed to enable 2FA:', error);
      if (error?.response?.status === 404 || error?.response?.status === 501) {
        alert('Функция 2FA еще не реализована на сервере. Пожалуйста, обратитесь к администратору.');
      } else {
        alert(error?.response?.data?.message || 'Не удалось начать настройку 2FA');
      }
    } finally {
      setEnabling2FA(false);
    }
  };

  // 🔥 FLOW S3: Verify 2FA (step 2 - confirm with code)
  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Введите 6-значный код из приложения-аутентификатора');
      return;
    }

    try {
      setVerifying2FA(true);
      await api('/api/user/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      setTwoFactorEnabled(true);
      setShowBackupCodes(true);
      setVerificationCode('');
    } catch (error: any) {
      console.error('Failed to verify 2FA:', error);
      if (error?.response?.status === 404 || error?.response?.status === 501) {
        alert('Функция 2FA еще не реализована на сервере.');
        setShow2FAModal(false);
        setQrCode(null);
        setBackupCodes([]);
        setVerificationCode('');
      } else {
        alert(error?.response?.data?.message || 'Неверный код. Попробуйте еще раз.');
      }
    } finally {
      setVerifying2FA(false);
    }
  };

  // 🔥 FLOW S3: Disable 2FA
  const handleDisable2FA = async () => {
    if (!confirm('Вы уверены, что хотите отключить двухфакторную аутентификацию? Это снизит безопасность вашего аккаунта.')) {
      return;
    }

    const password = prompt('Для отключения 2FA введите ваш пароль:');
    if (!password) {
      return;
    }

    const code = prompt('Введите код из приложения-аутентификатора:');
    if (!code) {
      return;
    }

    try {
      await api('/api/user/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password, code }),
      });
      setTwoFactorEnabled(false);
      alert('2FA успешно отключена');
    } catch (error: any) {
      console.error('Failed to disable 2FA:', error);
      if (error?.response?.status === 404 || error?.response?.status === 501) {
        alert('Функция 2FA еще не реализована на сервере.');
      } else {
        alert(error?.response?.data?.message || 'Не удалось отключить 2FA');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Безопасность</h2>
        <p className="text-gray-400 mt-1">
          Управление паролем, активными сессиями и двухфакторной аутентификацией.
        </p>
      </div>

      {/* Смена пароля */}
      <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#3347ff]/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#3347ff]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Смена пароля</h3>
            <p className="text-sm text-gray-400">Обновите пароль для обеспечения безопасности аккаунта.</p>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Введите текущий пароль"
              disabled={changingPassword}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Мин. 8 символов"
              disabled={changingPassword}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Подтвердите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите новый пароль"
              disabled={changingPassword}
              className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 disabled:opacity-50 ${
                confirmPassword && newPassword && confirmPassword !== newPassword ? 'border-red-500/50' : 'border-white/20'
              }`}
            />
            {confirmPassword && newPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-400 mt-1">Пароли не совпадают</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              className="px-4 py-2 rounded-lg bg-[#3347ff] text-white text-sm font-medium hover:bg-[#3347ff]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? <><RefreshCw className="w-4 h-4 animate-spin" /> Изменение...</> : <><Save className="w-4 h-4" /> Обновить пароль</>}
            </button>
            <button
              type="button"
              onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              disabled={changingPassword}
              className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      {/* Активные сессии */}
      <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Активные сессии</h3>
            <p className="text-sm text-gray-400">Устройства, с которых выполнен вход в аккаунт.</p>
          </div>
        </div>
        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Нет активных сессий
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const { device, browser } = parseUserAgent(session.userAgent);
                const location = session.ipAddress 
                  ? (session.ipAddress.includes(':') ? `IPv6: ${session.ipAddress.substring(0, 20)}...` : session.ipAddress)
                  : 'Неизвестное местоположение';
                const lastActive = formatDate(session.createdAt);
                const isExpired = new Date(session.expiresAt) < new Date();

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors ${
                      isCurrent ? 'bg-[#3347ff]/10 border-[#3347ff]/30' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#3347ff]/20' : 'bg-white/10'}`}>
                        <Monitor className={`w-5 h-5 ${isCurrent ? 'text-[#3347ff]' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {device} • {browser}
                          {isCurrent && <span className="ml-2 text-xs font-normal text-[#3347ff]">(текущее)</span>}
                          {isExpired && <span className="ml-2 text-xs font-normal text-red-400">(истекла)</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {location} • {lastActive}
                          {isExpired && ' • Истекла'}
                        </p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id || isExpired}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isExpired ? 'Сессия уже истекла' : 'Завершить сессию'}
                      >
                        {revokingSessionId === session.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={revokingOthers}
                className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-gray-300 text-sm font-medium hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {revokingOthers ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Завершение...
                  </>
                ) : (
                  'Завершить все другие сессии'
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Двухфакторная аутентификация (2FA) */}
      <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Двухфакторная аутентификация</h3>
              <p className="text-sm text-gray-400">Дополнительная защита входа с помощью приложения-аутентификатора.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
              twoFactorEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-white/10 text-gray-400 border-white/20'
            }`}>
              {twoFactorEnabled ? 'Включено' : 'Выключено'}
            </span>
            {twoFactorEnabled ? (
              <button
                type="button"
                onClick={handleDisable2FA}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-medium hover:bg-red-500/30 hover:border-red-500 transition-colors flex items-center gap-2"
              >
                Отключить 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnable2FA}
                disabled={enabling2FA}
                className="px-4 py-2 rounded-lg bg-[#3347ff] text-white text-sm font-medium hover:bg-[#3347ff]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enabling2FA ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Настройка...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Включить 2FA
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">
            Рекомендуем включить 2FA для максимальной защиты аккаунта. Используйте Google Authenticator, Authy или аналог.
          </p>
        </div>
      </div>

      {/* 🔥 FLOW S3: 2FA Setup Modal */}
      {show2FAModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!verifying2FA && !showBackupCodes) {
                setShow2FAModal(false);
                setQrCode(null);
                setBackupCodes([]);
                setVerificationCode('');
              }
            }}
          >
            <div 
              className="bg-[#0a1635] border border-white/20 rounded-xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {!showBackupCodes ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Настройка 2FA</h3>
                      <p className="text-sm text-gray-400">Отсканируйте QR-код в приложении</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-300 mb-4">
                      1. Откройте приложение-аутентификатор (Google Authenticator, Authy и т.д.)
                    </p>
                    <p className="text-sm text-gray-300 mb-4">
                      2. Отсканируйте QR-код ниже
                    </p>
                    {qrCode && (
                      <div className="flex justify-center mb-4">
                        <img src={qrCode} alt="QR Code" className="w-64 h-64 border border-white/20 rounded-lg" />
                      </div>
                    )}
                    <p className="text-sm text-gray-300 mb-4">
                      3. Введите 6-значный код из приложения для подтверждения:
                    </p>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                        setVerificationCode(value);
                      }}
                      placeholder="000000"
                      disabled={verifying2FA}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 disabled:opacity-50"
                      autoFocus
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShow2FAModal(false);
                        setQrCode(null);
                        setBackupCodes([]);
                        setVerificationCode('');
                      }}
                      disabled={verifying2FA}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleVerify2FA}
                      disabled={verifying2FA || verificationCode.length !== 6}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-[#3347ff] text-white hover:bg-[#3347ff]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {verifying2FA ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Проверка...
                        </>
                      ) : (
                        'Подтвердить'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">2FA успешно включена!</h3>
                      <p className="text-sm text-gray-400">Сохраните резервные коды</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-400 mb-1">Важно!</p>
                          <p className="text-xs text-gray-300">
                            Сохраните эти резервные коды в безопасном месте. Они понадобятся, если вы потеряете доступ к приложению-аутентификатору.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Резервные коды:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((code, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 bg-white/5 rounded text-center font-mono text-sm text-white border border-white/10"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShow2FAModal(false);
                      setShowBackupCodes(false);
                      setQrCode(null);
                      setBackupCodes([]);
                      setVerificationCode('');
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#3347ff] text-white hover:bg-[#3347ff]/90 transition-colors font-medium"
                  >
                    Готово
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleCloseModal = () => {
    setSelectedTopic(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white">Чем мы можем помочь?</h2>
        <p className="text-gray-400 mt-2">Поищите в нашей базе знаний или просмотрите категории помощи ниже.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Опишите вашу проблему (например, 'верификация не прошла', 'вывод средств')"
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#0a1635] border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
          />
        </div>
        <button
          type="button"
          className="px-6 py-3 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#3347ff]/90 transition-colors shrink-0"
        >
          Поиск
        </button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-[#3347ff] rounded-full" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Просмотр тем помощи</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HELP_TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => handleTopicClick(topic.id)}
              className="rounded-xl bg-[#0a1635] border border-white/10 p-5 text-left hover:border-white/20 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-10 h-10 rounded-full ${topic.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${topic.iconColor}`} />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white shrink-0 transition-colors" />
              </div>
              <h4 className="font-semibold text-white mb-1">{topic.title}</h4>
              <p className="text-sm text-gray-400 leading-relaxed">{topic.description}</p>
            </button>
          );
        })}
      </div>

      {/* Модалка с детальной информацией */}
      {selectedTopic && (
        <HelpTopicModal topicId={selectedTopic} onClose={handleCloseModal} />
      )}
    </div>
  );
}

// Компонент модалки с детальной информацией по теме
function HelpTopicModal({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const topic = HELP_TOPICS.find(t => t.id === topicId);
  const Icon = topic?.icon;

  const getTopicContent = () => {
    switch (topicId) {
      case 'account':
        return {
          title: 'Управление аккаунтом',
          sections: [
            {
              heading: 'Верификация аккаунта',
              content: [
                'Для полного доступа к функциям платформы необходимо пройти верификацию.',
                'Загрузите документ, удостоверяющий личность (паспорт, водительское удостоверение или ID-карта).',
                'Время обработки: обычно в течение 24 часов в рабочие дни.',
                'После верификации вы сможете выводить средства и использовать все функции платформы.',
              ],
            },
            {
              heading: 'Редактирование профиля',
              content: [
                'В разделе "Профиль" вы можете изменить личные данные: имя, фамилию, никнейм, телефон, страну и дату рождения.',
                'Некоторые данные (например, email) требуют дополнительной проверки при изменении.',
                'Рекомендуем указывать актуальную информацию для быстрого решения вопросов службой поддержки.',
              ],
            },
            {
              heading: 'Смена пароля',
              content: [
                'Перейдите в раздел "Безопасность" → "Смена пароля".',
                'Введите текущий пароль и новый пароль (минимум 8 символов).',
                'После смены пароля все активные сессии будут завершены, кроме текущей.',
                'Используйте надежный пароль, содержащий буквы, цифры и специальные символы.',
              ],
            },
            {
              heading: 'Активные сессии',
              content: [
                'В разделе "Безопасность" вы можете просмотреть все активные сессии вашего аккаунта.',
                'Для каждой сессии отображается устройство, браузер, IP-адрес и время последней активности.',
                'Вы можете завершить любую сессию, кроме текущей.',
                'Если вы заметили подозрительную активность, немедленно завершите все сессии и смените пароль.',
              ],
            },
          ],
        };
      case 'deposits':
        return {
          title: 'Пополнение и вывод средств',
          sections: [
            {
              heading: 'Способы пополнения',
              content: [
                'Банковская карта (VISA, Mastercard) — мгновенное зачисление, без комиссии.',
                'Криптовалюта (BTC, ETH, USDT) — поддержка сетей TRC20 и ERC20, зачисление в течение 15-30 минут.',
                'Банковский перевод (SWIFT/SEPA) — обработка 1-3 рабочих дня, без комиссии.',
                'Минимальная сумма пополнения: $10.',
              ],
            },
            {
              heading: 'Вывод средств',
              content: [
                'Вывод доступен только на верифицированные аккаунты.',
                'Средства выводятся на те же реквизиты, с которых было пополнение (для карт).',
                'Время обработки: банковские карты — 1-3 рабочих дня, криптовалюта — до 24 часов.',
                'Минимальная сумма вывода: $20.',
              ],
            },
            {
              heading: 'Лимиты транзакций',
              content: [
                'Максимальная сумма одной транзакции: $50,000.',
                'Суточный лимит пополнения: $100,000.',
                'Суточный лимит вывода: $50,000.',
                'Для увеличения лимитов обратитесь в службу поддержки.',
              ],
            },
            {
              heading: 'Решение проблем',
              content: [
                'Если транзакция не прошла, проверьте баланс карты и лимиты банка.',
                'Для криптовалютных переводов убедитесь, что используете правильную сеть (TRC20/ERC20).',
                'При задержке более 24 часов обратитесь в службу поддержки с номером транзакции.',
              ],
            },
          ],
        };
      case 'trading':
        return {
          title: 'Графики и инструменты',
          sections: [
            {
              heading: 'Типы графиков',
              content: [
                'Свечной график (Candlestick) — отображение цены в виде японских свечей с открытием, максимумом, минимумом и закрытием.',
                'Линейный график (Line Chart) — плавная линия, соединяющая цены закрытия.',
                'Переключение между типами графиков доступно через меню в верхней части графика.',
              ],
            },
            {
              heading: 'Индикаторы технического анализа',
              content: [
                'Доступны популярные индикаторы: Moving Average (MA), RSI, MACD, Bollinger Bands, Stochastic и другие.',
                'Добавление индикатора: нажмите на иконку индикаторов в меню графика, выберите нужный.',
                'Настройка параметров: кликните на индикатор на графике для изменения параметров.',
                'Избранные индикаторы: добавьте часто используемые индикаторы в избранное для быстрого доступа.',
              ],
            },
            {
              heading: 'Инструменты рисования',
              content: [
                'Линии тренда — для обозначения уровней поддержки и сопротивления.',
                'Горизонтальные линии — для отметки важных ценовых уровней.',
                'Вертикальные линии — для выделения временных точек.',
                'Фигуры: прямоугольники, треугольники, эллипсы — для выделения зон на графике.',
                'Текст и метки — для добавления комментариев к анализу.',
                'Все инструменты доступны через меню рисования, часто используемые можно добавить в избранное.',
              ],
            },
            {
              heading: 'Настройка отображения',
              content: [
                'Таймфреймы: выбор периода свечей (5 секунд, 15 секунд, 1 минута, 5 минут и т.д.).',
                'Масштабирование: колесико мыши или жесты на тачпаде для увеличения/уменьшения.',
                'Перемещение по графику: зажмите левую кнопку мыши и перетаскивайте график.',
                'Кнопка "Сброс" возвращает график к исходному виду.',
              ],
            },
            {
              heading: 'Работа с графиком',
              content: [
                'Кроссхейр: наведите мышь на график для отображения текущей цены и времени.',
                'OHLC панель: показывает значения Open, High, Low, Close для выбранной свечи.',
                'Отображение сделок: ваши открытые и закрытые сделки отображаются на графике.',
                'Алерты: установите уведомления о достижении ценой определенных уровней.',
              ],
            },
          ],
        };
      case 'markets':
        return {
          title: 'Рынки и инструменты',
          sections: [
            {
              heading: 'Доступные рынки',
              content: [
                'Форекс (Forex) — валютные пары: EUR/USD, GBP/USD, USD/JPY и другие.',
                'Криптовалюты — BTC/USD, ETH/USD, LTC/USD и другие популярные пары.',
                'OTC (Over-The-Counter) — внебиржевые инструменты с расширенными торговыми часами.',
                'Все инструменты доступны через меню выбора валютной пары на графике.',
              ],
            },
            {
              heading: 'Торговые часы',
              content: [
                'Форекс: круглосуточно с понедельника по пятницу (кроме выходных).',
                'Криптовалюты: торговля доступна 24/7.',
                'OTC: доступны для торговли в любое время.',
                'Время закрытия рынков отображается на графике в виде обратного отсчета.',
              ],
            },
            {
              heading: 'Типы сделок',
              content: [
                'CALL (Вверх) — ставка на рост цены. Если цена в момент экспирации выше цены входа, сделка выигрывает.',
                'PUT (Вниз) — ставка на падение цены. Если цена в момент экспирации ниже цены входа, сделка выигрывает.',
                'Выплата при выигрыше: 80% от суммы ставки.',
                'При ничьей (цена равна цене входа) сумма ставки возвращается без прибыли.',
              ],
            },
            {
              heading: 'Время экспирации',
              content: [
                'Минимальное время: 5 секунд.',
                'Максимальное время: 5 минут (300 секунд).',
                'Шаг изменения: 5 секунд.',
                'Выберите время экспирации перед открытием сделки.',
              ],
            },
            {
              heading: 'Размер ставки',
              content: [
                'Минимальная ставка: $1.',
                'Максимальная ставка зависит от баланса вашего счета.',
                'Рекомендуем не рисковать более 5-10% от баланса на одну сделку.',
                'Используйте демо-счет для практики перед торговлей на реальные средства.',
              ],
            },
          ],
        };
      case 'education':
        return {
          title: 'Обучение и глоссарий',
          sections: [
            {
              heading: 'Основы торговли',
              content: [
                'Бинарные опционы — финансовый инструмент с фиксированной выплатой при правильном прогнозе направления цены.',
                'Экспирация — момент времени, когда определяется результат сделки.',
                'Входная цена (Entry Price) — цена актива в момент открытия сделки.',
                'Выходная цена (Exit Price) — цена актива в момент экспирации.',
              ],
            },
            {
              heading: 'Технический анализ',
              content: [
                'Используйте индикаторы для определения тренда и точек входа.',
                'Изучайте паттерны свечей для прогнозирования движения цены.',
                'Анализируйте уровни поддержки и сопротивления.',
                'Комбинируйте несколько индикаторов для повышения точности прогнозов.',
              ],
            },
            {
              heading: 'Управление рисками',
              content: [
                'Никогда не рискуйте более 5-10% баланса на одну сделку.',
                'Используйте стоп-лоссы и тейк-профиты (через управление позициями).',
                'Не открывайте сделки под влиянием эмоций.',
                'Ведите журнал сделок для анализа своих ошибок и успехов.',
              ],
            },
            {
              heading: 'Полезные ресурсы',
              content: [
                'Изучайте исторические данные и паттерны на графиках.',
                'Используйте демо-счет для отработки стратегий без риска.',
                'Следите за экономическими новостями, влияющими на рынки.',
                'Присоединяйтесь к сообществу трейдеров для обмена опытом.',
              ],
            },
          ],
        };
      case 'security':
        return {
          title: 'Безопасность и конфиденциальность',
          sections: [
            {
              heading: 'Двухфакторная аутентификация (2FA)',
              content: [
                '2FA добавляет дополнительный уровень защиты вашего аккаунта.',
                'Настройка: раздел "Безопасность" → "Включить 2FA".',
                'Отсканируйте QR-код в приложении-аутентификаторе (Google Authenticator, Authy).',
                'Сохраните резервные коды в безопасном месте — они понадобятся при потере доступа к приложению.',
                'При входе в аккаунт потребуется ввести код из приложения после пароля.',
              ],
            },
            {
              heading: 'Защита пароля',
              content: [
                'Используйте уникальный пароль, не используемый на других сайтах.',
                'Пароль должен содержать минимум 8 символов, буквы, цифры и специальные символы.',
                'Не передавайте пароль третьим лицам.',
                'Регулярно меняйте пароль (рекомендуется раз в 3-6 месяцев).',
              ],
            },
            {
              heading: 'Активные сессии',
              content: [
                'Регулярно проверяйте список активных сессий в разделе "Безопасность".',
                'Завершайте сессии на устройствах, которыми больше не пользуетесь.',
                'Если заметили подозрительную активность, немедленно завершите все сессии и смените пароль.',
                'После смены пароля все сессии автоматически завершаются, кроме текущей.',
              ],
            },
            {
              heading: 'Политика конфиденциальности',
              content: [
                'Мы не передаем ваши персональные данные третьим лицам без вашего согласия.',
                'Все данные передаются по защищенному соединению (HTTPS).',
                'Финансовые транзакции обрабатываются через защищенные платежные системы.',
                'Подробная информация доступна в разделе "Политика конфиденциальности".',
              ],
            },
            {
              heading: 'Сообщение о подозрительной активности',
              content: [
                'Если вы заметили несанкционированный доступ к аккаунту, немедленно:',
                '1. Завершите все активные сессии.',
                '2. Смените пароль.',
                '3. Включите 2FA (если еще не включено).',
                '4. Свяжитесь со службой поддержки для блокировки аккаунта.',
              ],
            },
          ],
        };
      default:
        return { title: '', sections: [] };
    }
  };

  const content = getTopicContent();

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#0a1635] border border-white/20 rounded-xl p-6 max-w-3xl w-full shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`w-10 h-10 rounded-full ${topic?.iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${topic?.iconColor}`} />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white">{content.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {content.sections.map((section, index) => (
            <div key={index} className="border-b border-white/10 pb-6 last:border-0">
              <h3 className="text-lg font-semibold text-white mb-3">{section.heading}</h3>
              <ul className="space-y-2">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-300 leading-relaxed flex items-start gap-2">
                    <span className="text-[#3347ff] mt-1.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Нужна дополнительная помощь? Свяжитесь с нашей службой поддержки.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#3347ff]/90 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}


function TabEducation() {
  const [activeSection, setActiveSection] = useState<'strategies' | 'indicators' | 'techniques'>('strategies');

  const strategies = [
    {
      id: '1',
      title: 'Стратегия "Тренд-фолловер"',
      description: 'Следуйте за трендом и открывайте позиции в направлении движения цены. Эта стратегия основана на принципе "тренд - ваш друг".',
      content: [
        'Определите направление тренда с помощью индикаторов (например, скользящие средние)',
        'Открывайте позиции только в направлении тренда',
        'Используйте стоп-лоссы для ограничения убытков',
        'Устанавливайте тейк-профиты на уровнях сопротивления/поддержки',
        'Не торгуйте против тренда - это увеличивает риск',
      ],
      difficulty: 'Начальный',
      timeFrame: 'Среднесрочный',
      riskLevel: 'Средний',
    },
    {
      id: '2',
      title: 'Стратегия "Скальпинг"',
      description: 'Быстрые сделки с минимальным временем удержания позиции. Требует высокой концентрации и дисциплины.',
      content: [
        'Используйте короткие таймфреймы (1-5 минут)',
        'Открывайте множество небольших сделок в течение дня',
        'Фиксируйте небольшую прибыль быстро',
        'Используйте тесные стоп-лоссы',
        'Требуется быстрая реакция и опыт',
      ],
      difficulty: 'Продвинутый',
      timeFrame: 'Краткосрочный',
      riskLevel: 'Высокий',
    },
    {
      id: '3',
      title: 'Стратегия "Отскок от уровней"',
      description: 'Торговля на отскоке цены от ключевых уровней поддержки и сопротивления.',
      content: [
        'Определите ключевые уровни поддержки и сопротивления',
        'Дождитесь отскока цены от уровня',
        'Открывайте позицию в направлении отскока',
        'Используйте подтверждающие индикаторы (RSI, MACD)',
        'Устанавливайте стоп-лосс за уровнем',
      ],
      difficulty: 'Средний',
      timeFrame: 'Среднесрочный',
      riskLevel: 'Средний',
    },
    {
      id: '4',
      title: 'Стратегия "Пробой уровней"',
      description: 'Торговля на пробое важных уровней поддержки или сопротивления с подтверждением объема.',
      content: [
        'Определите консолидацию цены перед уровнем',
        'Дождитесь пробоя с увеличением объема',
        'Открывайте позицию в направлении пробоя',
        'Используйте фильтры для подтверждения (объем, волатильность)',
        'Устанавливайте стоп-лосс на уровне консолидации',
      ],
      difficulty: 'Средний',
      timeFrame: 'Среднесрочный',
      riskLevel: 'Средний',
    },
    {
      id: '5',
      title: 'Стратегия "Арбитраж"',
      description: 'Использование разницы цен на разных рынках или инструментах для получения прибыли.',
      content: [
        'Найдите коррелирующие инструменты',
        'Отслеживайте расхождения в ценах',
        'Открывайте противоположные позиции',
        'Фиксируйте прибыль при сближении цен',
        'Требуется быстрая реакция и низкие комиссии',
      ],
      difficulty: 'Продвинутый',
      timeFrame: 'Краткосрочный',
      riskLevel: 'Низкий',
    },
    {
      id: '6',
      title: 'Стратегия "Контртрендовая торговля"',
      description: 'Торговля против текущего тренда на перекупленности/перепроданности рынка.',
      content: [
        'Используйте осцилляторы (RSI, Stochastic)',
        'Ищите признаки разворота тренда',
        'Открывайте позиции на экстремальных уровнях',
        'Используйте строгие стоп-лоссы',
        'Высокий риск - требует опыта',
      ],
      difficulty: 'Продвинутый',
      timeFrame: 'Краткосрочный',
      riskLevel: 'Высокий',
    },
  ];

  const indicators = [
    {
      id: '1',
      name: 'RSI (Relative Strength Index)',
      description: 'Индикатор относительной силы показывает перекупленность и перепроданность рынка.',
      usage: [
        'Значения выше 70 указывают на перекупленность (возможен разворот вниз)',
        'Значения ниже 30 указывают на перепроданность (возможен разворот вверх)',
        'Используйте для поиска точек входа в контртрендовых стратегиях',
        'Комбинируйте с другими индикаторами для подтверждения сигналов',
        'Период по умолчанию: 14 свечей',
      ],
      formula: 'RSI = 100 - (100 / (1 + RS)), где RS = средний рост / средний спад',
      bestFor: 'Определение перекупленности/перепроданности',
    },
    {
      id: '2',
      name: 'MACD (Moving Average Convergence Divergence)',
      description: 'Индикатор схождения и расхождения скользящих средних показывает изменение импульса тренда.',
      usage: [
        'Пересечение линии MACD с сигнальной линией дает сигналы на покупку/продажу',
        'Дивергенция между MACD и ценой может предсказывать разворот тренда',
        'Гистограмма MACD показывает силу тренда',
        'Используйте на средних и долгих таймфреймах для лучших результатов',
        'Комбинируйте с анализом тренда',
      ],
      formula: 'MACD = EMA(12) - EMA(26), Signal = EMA(9) MACD',
      bestFor: 'Определение направления и силы тренда',
    },
    {
      id: '3',
      name: 'Bollinger Bands (Полосы Боллинджера)',
      description: 'Динамические уровни поддержки и сопротивления, основанные на волатильности рынка.',
      usage: [
        'Цена, касающаяся верхней полосы, может указывать на перекупленность',
        'Цена, касающаяся нижней полосы, может указывать на перепроданность',
        'Сужение полос указывает на низкую волатильность (возможен резкий движение)',
        'Расширение полос указывает на высокую волатильность',
        'Используйте вместе с другими индикаторами для подтверждения',
      ],
      formula: 'Средняя линия = SMA(20), Верхняя/Нижняя = SMA ± (2 × стандартное отклонение)',
      bestFor: 'Определение волатильности и экстремальных уровней',
    },
    {
      id: '4',
      name: 'Moving Average (Скользящие средние)',
      description: 'Средняя цена за определенный период, сглаживающая колебания и показывающая направление тренда.',
      usage: [
        'SMA (простая) - равномерное усреднение всех значений',
        'EMA (экспоненциальная) - больше веса недавним значениям',
        'Пересечение короткой и длинной MA дает сигналы на покупку/продажу',
        'Цена выше MA указывает на восходящий тренд',
        'Цена ниже MA указывает на нисходящий тренд',
      ],
      formula: 'SMA = сумма цен за период / количество периодов, EMA = цена × множитель + предыдущая EMA × (1 - множитель)',
      bestFor: 'Определение направления тренда и точек входа',
    },
    {
      id: '5',
      name: 'Stochastic Oscillator',
      description: 'Осциллятор, показывающий положение текущей цены относительно диапазона цен за период.',
      usage: [
        'Значения выше 80 указывают на перекупленность',
        'Значения ниже 20 указывают на перепроданность',
        'Пересечение %K и %D дает торговые сигналы',
        'Используйте для поиска точек разворота',
        'Комбинируйте с трендовыми индикаторами',
      ],
      formula: '%K = ((текущая цена - минимум) / (максимум - минимум)) × 100, %D = SMA(%K)',
      bestFor: 'Определение моментов разворота тренда',
    },
    {
      id: '6',
      name: 'Fibonacci Retracement',
      description: 'Уровни коррекции на основе последовательности Фибоначчи, показывающие потенциальные точки разворота.',
      usage: [
        'Определите значимый тренд (от минимума к максимуму или наоборот)',
        'Уровни 23.6%, 38.2%, 50%, 61.8% - ключевые уровни коррекции',
        'Цена часто отскакивает от этих уровней',
        'Используйте для установки тейк-профитов и стоп-лоссов',
        'Комбинируйте с другими инструментами технического анализа',
      ],
      formula: 'Уровень = начальная точка ± (диапазон × коэффициент Фибоначчи)',
      bestFor: 'Определение уровней поддержки/сопротивления и целей',
    },
    {
      id: '7',
      name: 'Volume (Объем)',
      description: 'Количество сделок за период, показывающее активность рынка и подтверждающее движения цены.',
      usage: [
        'Высокий объем подтверждает силу движения цены',
        'Низкий объем может указывать на слабость тренда',
        'Рост объема при пробое уровня увеличивает вероятность успеха',
        'Дивергенция объема и цены может предсказывать разворот',
        'Используйте для фильтрации торговых сигналов',
      ],
      formula: 'Объем = количество контрактов/акций, проданных за период',
      bestFor: 'Подтверждение силы движения и фильтрация сигналов',
    },
    {
      id: '8',
      name: 'ADX (Average Directional Index)',
      description: 'Индикатор силы тренда, показывающий, насколько силен текущий тренд (не направление).',
      usage: [
        'Значения выше 25 указывают на сильный тренд',
        'Значения ниже 20 указывают на слабый тренд или флэт',
        'Используйте для определения, стоит ли торговать по тренду',
        'Комбинируйте с +DI и -DI для определения направления',
        'Не дает сигналов на покупку/продажу, только силу тренда',
      ],
      formula: 'ADX = сглаженное значение DX, где DX = |+DI - -DI| / (+DI + -DI) × 100',
      bestFor: 'Определение силы тренда и выбора стратегии',
    },
  ];

  const techniques = [
    {
      id: '1',
      title: 'Управление рисками',
      description: 'Основные принципы управления капиталом и ограничения убытков.',
      content: [
        'Никогда не рискуйте более 1-2% капитала на одну сделку',
        'Используйте стоп-лоссы для каждой позиции',
        'Соотношение риск/прибыль должно быть минимум 1:2',
        'Диверсифицируйте портфель между разными инструментами',
        'Не увеличивайте размер позиции после убытков (эмоциональная торговля)',
        'Ведите журнал сделок для анализа ошибок',
        'Устанавливайте дневной лимит убытков',
      ],
      category: 'Риск-менеджмент',
    },
    {
      id: '2',
      title: 'Психология торговли',
      description: 'Управление эмоциями и поддержание дисциплины в торговле.',
      content: [
        'Торгуйте по плану, а не по эмоциям',
        'Принимайте убытки как часть торговли',
        'Не пытайтесь отыграться после проигрыша',
        'Избегайте жадности - фиксируйте прибыль вовремя',
        'Не бойтесь упустить возможность - рынок всегда открыт',
        'Делайте перерывы при усталости или стрессе',
        'Ведите дневник эмоций для самоконтроля',
      ],
      category: 'Психология',
    },
    {
      id: '3',
      title: 'Анализ графических паттернов',
      description: 'Распознавание и использование классических графических фигур для прогнозирования движения цены.',
      content: [
        'Голова и плечи - разворотный паттерн, указывающий на смену тренда',
        'Двойная вершина/дно - сигнал разворота тренда',
        'Треугольники - паттерны консолидации перед продолжением тренда',
        'Флаги и вымпелы - паттерны продолжения тренда',
        'Клинья - могут быть как разворотными, так и продолжения',
        'Используйте объем для подтверждения паттернов',
        'Устанавливайте цели на основе высоты паттерна',
      ],
      category: 'Технический анализ',
    },
    {
      id: '4',
      title: 'Множественные таймфреймы',
      description: 'Анализ нескольких временных интервалов для принятия более точных решений.',
      content: [
        'Используйте старший таймфрейм для определения основного тренда',
        'Средний таймфрейм для поиска точек входа',
        'Младший таймфрейм для точного определения момента входа',
        'Торгуйте в направлении старшего таймфрейма',
        'Используйте соотношение 4:1 или 5:1 между таймфреймами',
        'Пример: дневной → 4-часовой → часовой',
        'Это увеличивает вероятность успешных сделок',
      ],
      category: 'Анализ',
    },
    {
      id: '5',
      title: 'Поддержка и сопротивление',
      description: 'Определение ключевых уровней, где цена может развернуться или продолжить движение.',
      content: [
        'Уровни поддержки - где цена может отскочить вверх',
        'Уровни сопротивления - где цена может отскочить вниз',
        'Чем чаще цена касалась уровня, тем он сильнее',
        'Пробой уровня с объемом может привести к сильному движению',
        'Используйте круглые числа как психологические уровни',
        'Комбинируйте с индикаторами для подтверждения',
        'Уровни могут меняться ролями после пробоя',
      ],
      category: 'Технический анализ',
    },
    {
      id: '6',
      title: 'Дивергенция',
      description: 'Расхождение между движением цены и индикатором, указывающее на возможный разворот.',
      content: [
        'Бычья дивергенция: цена делает новые минимумы, а индикатор - нет (сигнал на покупку)',
        'Медвежья дивергенция: цена делает новые максимумы, а индикатор - нет (сигнал на продажу)',
        'Используйте RSI, MACD или Stochastic для поиска дивергенций',
        'Дивергенция на старших таймфреймах более надежна',
        'Не открывайте позицию сразу - дождитесь подтверждения',
        'Комбинируйте с другими сигналами для увеличения вероятности',
      ],
      category: 'Технический анализ',
    },
    {
      id: '7',
      title: 'Торговля на новостях',
      description: 'Использование экономических новостей и событий для принятия торговых решений.',
      content: [
        'Следите за экономическим календарем важных событий',
        'Высокая волатильность во время новостей увеличивает риск',
        'Избегайте торговли за несколько минут до и после важных новостей',
        'Используйте отложенные ордера для торговли на новостях',
        'Понимайте влияние новостей на конкретные валютные пары',
        'Учитывайте ожидания рынка, а не только фактические данные',
        'Используйте стоп-лоссы при торговле на новостях',
      ],
      category: 'Фундаментальный анализ',
    },
    {
      id: '8',
      title: 'Торговые сессии',
      description: 'Понимание особенностей разных торговых сессий и их влияние на волатильность.',
      content: [
        'Азиатская сессия (Токио) - обычно низкая волатильность',
        'Европейская сессия (Лондон) - высокая активность по EUR, GBP',
        'Американская сессия (Нью-Йорк) - самая высокая волатильность',
        'Перекрытие сессий создает максимальную активность',
        'Адаптируйте стратегию под активность сессии',
        'Учитывайте время выхода важных экономических данных',
        'Некоторые пары более активны в определенные сессии',
      ],
      category: 'Торговые часы',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Обучение торговле</h1>
        <p className="text-gray-400 text-sm">
          Изучите стратегии, индикаторы и техники для успешной торговли на финансовых рынках
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveSection('strategies')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'strategies'
              ? 'border-[#3347ff] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Стратегии
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('indicators')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'indicators'
              ? 'border-[#3347ff] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Индикаторы
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('techniques')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'techniques'
              ? 'border-[#3347ff] text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Техники
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeSection === 'strategies' && (
          <div className="grid gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{strategy.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{strategy.description}</p>
                  </div>
                  <div className="flex flex-col gap-1 ml-4 shrink-0">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      strategy.difficulty === 'Начальный' ? 'bg-emerald-500/20 text-emerald-400' :
                      strategy.difficulty === 'Средний' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {strategy.difficulty}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-500/20 text-blue-400">
                      {strategy.timeFrame}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      strategy.riskLevel === 'Низкий' ? 'bg-emerald-500/20 text-emerald-400' :
                      strategy.riskLevel === 'Средний' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      Риск: {strategy.riskLevel}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">Основные шаги:</h4>
                  <ul className="space-y-1.5">
                    {strategy.content.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-[#3347ff] mt-1 shrink-0">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'indicators' && (
          <div className="grid gap-4">
            {indicators.map((indicator) => (
              <div
                key={indicator.id}
                className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white mb-2">{indicator.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{indicator.description}</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Применение:</h4>
                    <ul className="space-y-1.5">
                      {indicator.usage.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-[#3347ff] mt-1 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Формула:</p>
                    <p className="text-sm text-gray-400 font-mono">{indicator.formula}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-1">Лучше всего подходит для:</p>
                    <p className="text-sm text-gray-300">{indicator.bestFor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'techniques' && (
          <div className="grid gap-4">
            {techniques.map((technique) => (
              <div
                key={technique.id}
                className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{technique.title}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-purple-500/20 text-purple-400">
                        {technique.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{technique.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">Ключевые моменты:</h4>
                  <ul className="space-y-1.5">
                    {technique.content.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-[#3347ff] mt-1 shrink-0">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabTrade() {
  // Date range state
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [statistics, setStatistics] = useState<{
    totalTrades: number;
    winRate: number;
    totalVolume: number;
    netProfit: number;
    winCount: number;
    lossCount: number;
    tieCount: number;
    maxTrade: { amount: number; date: string } | null;
    minTrade: { amount: number; date: string } | null;
    bestProfit: { profit: number; date: string } | null;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [balanceHistory, setBalanceHistory] = useState<Array<{ date: string; balance: number }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Load trade statistics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoadingStats(true);
        const response = await api<{ statistics: typeof statistics }>('/api/trades/statistics');
        setStatistics(response.statistics);
      } catch (error) {
        console.error('Failed to load trade statistics:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    loadStatistics();
  }, []);

  // Load balance history when date range changes
  useEffect(() => {
    const loadBalanceHistory = async () => {
      if (!startDate || !endDate) return;
      
      try {
        setLoadingHistory(true);
        const response = await api<{ history: Array<{ date: string; balance: number }> }>(
          `/api/trades/balance-history?startDate=${startDate}&endDate=${endDate}`
        );
        setBalanceHistory(response.history);
      } catch (error) {
        console.error('Failed to load balance history:', error);
        setBalanceHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadBalanceHistory();
  }, [startDate, endDate]);

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format date for chart (short format)
  const formatChartDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  };

  // Generate chart points from balance history
  const getChartPoints = () => {
    if (balanceHistory.length === 0) {
      return { points: [], dates: [], minBalance: 0, maxBalance: 0 };
    }

    const minBalance = Math.min(...balanceHistory.map(h => h.balance));
    const maxBalance = Math.max(...balanceHistory.map(h => h.balance));
    const range = maxBalance - minBalance || 1; // Avoid division by zero

    const points = balanceHistory.map((h, index) => ({
      x: (index / (balanceHistory.length - 1)) * 100,
      y: 100 - ((h.balance - minBalance) / range) * 95, // Leave 5% margin at bottom
      date: h.date,
      balance: h.balance,
    }));

    // Get dates for x-axis (show first, middle, last)
    const dates = [];
    if (balanceHistory.length > 0) {
      dates.push(formatChartDate(balanceHistory[0].date));
      if (balanceHistory.length > 2) {
        dates.push(formatChartDate(balanceHistory[Math.floor(balanceHistory.length / 2)].date));
      }
      if (balanceHistory.length > 1) {
        dates.push(formatChartDate(balanceHistory[balanceHistory.length - 1].date));
      }
    }

    return { points, dates, minBalance, maxBalance };
  };

  const { points: chartPoints, dates: chartDates, minBalance, maxBalance } = getChartPoints();

  // Handle mouse move on chart
  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (chartPoints.length === 0) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const svg = container.querySelector('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const x = ((e.clientX - svgRect.left) / svgRect.width) * 100;

    // Find closest point
    let closestIndex = 0;
    let minDistance = Math.abs(chartPoints[0].x - x);
    for (let i = 1; i < chartPoints.length; i++) {
      const distance = Math.abs(chartPoints[i].x - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    setHoveredIndex(closestIndex);
    
    // Position tooltip relative to container
    const tooltipX = e.clientX - rect.left;
    const tooltipY = e.clientY - rect.top;
    
    setTooltipPosition({
      x: tooltipX,
      y: tooltipY,
    });
  };

  const handleChartMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-8">Торговля</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          {statistics && statistics.totalTrades > 0 && (
            <span className={`absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
              statistics.winRate >= 50 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : statistics.winRate >= 30
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {statistics.winRate >= 50 ? 'Good' : statistics.winRate >= 30 ? 'Fair' : 'Low'}
            </span>
          )}
          <RefreshCw className={`w-8 h-8 text-[#3347ff] mb-3 ${loadingStats ? 'animate-spin' : ''}`} />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Всего сделок</p>
          <p className="text-2xl font-bold text-white mt-1">
            {loadingStats ? '...' : statistics ? statistics.totalTrades.toLocaleString() : '0'}
          </p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          {statistics && statistics.totalTrades > 0 && (
            <span className={`absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
              statistics.winRate >= 50 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : statistics.winRate >= 30
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {statistics.winRate >= 50 ? 'Good' : statistics.winRate >= 30 ? 'Fair' : 'Low'}
            </span>
          )}
          <div className="relative w-8 h-8">
            <svg className="absolute inset-0 w-full h-full text-gray-600" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              {statistics && statistics.totalTrades > 0 && (
                <circle 
                  cx="16" 
                  cy="16" 
                  r="14" 
                  fill="none" 
                  stroke={statistics.winRate >= 50 ? 'rgb(52, 211, 153)' : statistics.winRate >= 30 ? 'rgb(251, 191, 36)' : 'rgb(239, 68, 68)'} 
                  strokeWidth="2" 
                  strokeDasharray={`${(statistics.winRate / 100) * 88} ${88 - (statistics.winRate / 100) * 88}`}
                  strokeLinecap="round" 
                  transform="rotate(-90 16 16)" 
                />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {statistics && statistics.winRate >= 50 && <Check className="w-4 h-4 text-emerald-400" />}
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Процент побед</p>
          <p className="text-2xl font-bold text-white mt-1">
            {loadingStats ? '...' : statistics ? `${statistics.winRate.toFixed(1)}%` : '0%'}
          </p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
          <BarChart2 className="w-8 h-8 text-[#3347ff] mb-3" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Объем торговли</p>
          <p className="text-2xl font-bold text-white mt-1">
            {loadingStats ? '...' : statistics 
              ? `$${(statistics.totalVolume / 1000000).toFixed(statistics.totalVolume >= 1000000 ? 1 : 2)}${statistics.totalVolume >= 1000000 ? 'M' : statistics.totalVolume >= 1000 ? 'K' : ''}`
              : '$0'}
          </p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          {statistics && statistics.netProfit > 0 && (
            <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded whitespace-nowrap">
              {statistics.netProfit > 0 ? '+' : ''}${statistics.netProfit.toFixed(2)}
            </span>
          )}
          <ArrowUpSquare className="w-8 h-8 text-[#3347ff] mb-3" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Чистая прибыль</p>
          <p className={`text-2xl font-bold mt-1 ${
            statistics && statistics.netProfit > 0 
              ? 'text-emerald-400' 
              : statistics && statistics.netProfit < 0
              ? 'text-red-400'
              : 'text-white'
          }`}>
            {loadingStats ? '...' : statistics 
              ? `${statistics.netProfit >= 0 ? '+' : ''}$${statistics.netProfit.toFixed(2)}`
              : '$0.00'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#3347ff]" />
              <div>
                <h3 className="text-lg font-semibold text-white">Доходность</h3>
                <p className="text-sm text-gray-400">Анализ изменения баланса за выбранный период.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <label className="text-sm text-gray-400">От:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    if (newStartDate && endDate && newStartDate <= endDate) {
                      setStartDate(newStartDate);
                    } else if (newStartDate && !endDate) {
                      setStartDate(newStartDate);
                    }
                  }}
                  max={endDate || undefined}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">До:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    if (newEndDate && startDate && newEndDate >= startDate) {
                      setEndDate(newEndDate);
                    } else if (newEndDate && !startDate) {
                      setEndDate(newEndDate);
                    }
                  }}
                  min={startDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff] focus:border-transparent"
                />
              </div>
              {/* Quick preset buttons */}
              <div className="flex gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Последние 7 дней"
                >
                  7д
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 30);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Последние 30 дней"
                >
                  30д
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setMonth(start.getMonth() - 3);
                    setStartDate(start.toISOString().split('T')[0]);
                    setEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Последние 3 месяца"
                >
                  3м
                </button>
              </div>
            </div>
          </div>
          <div 
            className="h-56 relative"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
            style={{ cursor: 'crosshair' }}
          >
            {loadingHistory ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#3347ff] animate-spin" />
              </div>
            ) : chartPoints.length > 0 ? (
              <>
                <svg 
                  viewBox="0 0 400 120" 
                  className="w-full h-full" 
                  preserveAspectRatio="none"
                  pointerEvents="none"
                >
                  <defs>
                    <linearGradient id="tradeChartGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3347ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3347ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M ${chartPoints.map((p) => `${(p.x / 100) * 400},${(p.y / 100) * 120}`).join(' L ')} L 400,120 L 0,120 Z`}
                    fill="url(#tradeChartGrad)"
                  />
                  <path
                    d={`M ${chartPoints.map((p) => `${(p.x / 100) * 400},${(p.y / 100) * 120}`).join(' L ')}`}
                    fill="none"
                    stroke="#3347ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Vertical line on hover */}
                  {hoveredIndex !== null && (
                    <line
                      x1={(chartPoints[hoveredIndex].x / 100) * 400}
                      y1="0"
                      x2={(chartPoints[hoveredIndex].x / 100) * 400}
                      y2="120"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  )}
                  {/* All points (invisible for hover detection) */}
                  {chartPoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={(p.x / 100) * 400}
                      cy={(p.y / 100) * 120}
                      r="8"
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                  {/* Highlighted point on hover */}
                  {hoveredIndex !== null && (
                    <>
                      <circle
                        cx={(chartPoints[hoveredIndex].x / 100) * 400}
                        cy={(chartPoints[hoveredIndex].y / 100) * 120}
                        r="6"
                        fill="#3347ff"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>
                {/* Tooltip */}
                {hoveredIndex !== null && tooltipPosition && (
                  <div
                    className="absolute pointer-events-none z-10 bg-[#0a1635] border border-white/20 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
                    style={{
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y - 70}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="text-xs text-gray-400 mb-1">
                      {formatDate(chartPoints[hoveredIndex].date)}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      ${chartPoints[hoveredIndex].balance.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                Нет данных для отображения
              </div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {chartDates.length > 0 ? (
              chartDates.map((d, i) => (
                <span key={i}>{d}</span>
              ))
            ) : (
              <span className="text-gray-600">Нет данных</span>
            )}
          </div>
        </div>

        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-[#3347ff]" />
              Экстремумы торговли
            </h3>
            <div className="space-y-4">
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-[#3347ff]/20 text-[#3347ff] rounded">High</span>
                <ArrowUp className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Макс. сделка</p>
                <p className="text-xs text-gray-500">
                  {loadingStats ? '...' : statistics?.maxTrade ? formatDate(statistics.maxTrade.date) : 'Нет данных'}
                </p>
                <p className="text-lg font-bold text-white mt-1">
                  {loadingStats ? '...' : statistics?.maxTrade 
                    ? `$${statistics.maxTrade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '$0.00'}
                </p>
              </div>
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 text-[10px] text-gray-400 uppercase">Low</span>
                <ArrowDown className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Мин. сделка</p>
                <p className="text-xs text-gray-500">
                  {loadingStats ? '...' : statistics?.minTrade ? formatDate(statistics.minTrade.date) : 'Нет данных'}
                </p>
                <p className="text-lg font-bold text-white mt-1">
                  {loadingStats ? '...' : statistics?.minTrade 
                    ? `$${statistics.minTrade.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '$0.00'}
                </p>
              </div>
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded">Best</span>
                <Trophy className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Макс. прибыль</p>
                <p className="text-xs text-gray-500">
                  {loadingStats ? '...' : statistics?.bestProfit ? formatDate(statistics.bestProfit.date) : 'Нет данных'}
                </p>
                <p className="text-lg font-bold text-emerald-400 mt-1">
                  {loadingStats ? '...' : statistics?.bestProfit 
                    ? `+$${statistics.bestProfit.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '$0.00'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Совет</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Ваш процент побед увеличился на 5% в этом месяце. Рассмотрите возможность увеличения размера позиции на стандартных активах для максимизации прибыли.
            </p>
            <button type="button" className="text-sm text-[#3347ff] font-medium flex items-center gap-1 hover:underline">
              Посмотреть анализ
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const VALID_TABS: ProfileTab[] = ['profile', 'wallet', 'trade', 'support', 'security', 'education'];

function parseTab(searchParams: URLSearchParams): ProfileTab {
  const t = (searchParams.get('tab') as ProfileTab) || 'profile';
  return VALID_TABS.includes(t) ? t : 'profile';
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => parseTab(searchParams));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setActiveTab(parseTab(searchParams));
  }, [searchParams]);

  // Загрузка профиля пользователя
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const response = await api<{ user: UserProfile }>('/api/user/profile');
        const userProfile = response.user;
        setProfile(userProfile);
        setAvatarUrl(userProfile.avatarUrl || null);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/user/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();
      setAvatarUrl(data.avatarUrl);
      if (profile) {
        setProfile({ ...profile, avatarUrl: data.avatarUrl });
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const setTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    const q = tab === 'profile' ? '' : `?tab=${tab}`;
    router.replace(`/profile${q}`);
  };

  const tabs: { id: ProfileTab; label: string; icon: typeof UserCircle }[] = [
    { id: 'profile', label: 'Профиль', icon: UserCircle },
    { id: 'wallet', label: 'Кошелёк', icon: Wallet },
    { id: 'trade', label: 'Торговля', icon: TrendingUp },
    { id: 'education', label: 'Обучение', icon: GraduationCap },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'support', label: 'Поддержка', icon: MessageCircle },
  ];

  const displayName = profile?.firstName || profile?.lastName 
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() 
    : profile?.email?.split('@')[0] || 'User';

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-[#061230] flex flex-col">
        <header className="border-b border-white/10 shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <Link href="/terminal" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="ComforTrade"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <span className="text-xl font-semibold text-white uppercase">ComforTrade</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar */}
          <aside className="w-80 shrink-0 border-r border-white/10 flex flex-col">
            {/* Profile Card */}
            <div className="p-4 border-b border-white/10">
              <div className="rounded-xl bg-[#0a1635] border border-white/10 p-4">
                <div className="flex flex-col items-center">
                  <div className="relative inline-block">
                    {avatarUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#3347ff] flex items-center justify-center hover:bg-[#3347ff]/90 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                      {uploadingAvatar ? (
                        <RefreshCw className="w-3 h-3 text-white animate-spin" />
                      ) : (
                        <Pencil className="w-3 h-3 text-white" />
                      )}
                    </label>
                  </div>
                  <h3 className="mt-3 font-semibold text-white text-sm text-center">{displayName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 text-center">ID: {profile?.id?.slice(0, 8) || 'N/A'}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-3 rounded-xl bg-[#0a1635] border border-white/10 p-3">
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Контактная информация</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500">Email адрес</p>
                      <p className="text-white text-xs truncate">{profile?.email || 'N/A'}</p>
                    </div>
                    <span className="text-[9px] font-medium text-emerald-400 shrink-0">Подтверждено</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-500">Номер телефона</p>
                        <p className="text-white text-xs">{profile.phone}</p>
                      </div>
                      <button type="button" className="text-[9px] text-[#3347ff] hover:underline shrink-0">
                        ИЗМЕНИТЬ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col py-2.5 gap-1 px-2">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex items-center gap-3 w-full h-12 px-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#3347ff]/20 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.5] shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 px-6 py-8 overflow-auto">
            {activeTab === 'profile' && <TabProfile profile={profile} onProfileUpdate={setProfile} />}
            {activeTab === 'wallet' && <TabWallet />}
            {activeTab === 'trade' && <TabTrade />}
            {activeTab === 'education' && <TabEducation />}
            {activeTab === 'security' && <TabSecurity profile={profile} onProfileUpdate={setProfile} />}
            {activeTab === 'support' && <TabSupport />}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
