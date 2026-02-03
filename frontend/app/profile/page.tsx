'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactCountryFlag from 'react-country-flag';
import { Mail, Hash, Wallet, Calendar, Award, User, TrendingUp, MessageCircle, Upload, Trash2, LogOut, Globe } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/AppHeader';
import { WalletTab } from '@/components/profile/WalletTab';
import { TradeProfileTab } from '@/components/profile/TradeProfileTab';
import { SupportTab } from '@/components/profile/SupportTab';
import { SecuritySection } from '@/components/profile/SecurityTab';
import { api } from '@/lib/api/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { LANGUAGES, LANG_STORAGE_KEY } from '@/lib/languages';
import type { AccountSnapshot } from '@/types/account';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function formatBalance(balance: number, currency: string): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
  if (currency === 'USD') return `${formatted} USD`;
  if (currency === 'RUB') return `${formatted} ₽`;
  if (currency === 'UAH') return `${formatted} UAH`;
  return formatted;
}

const TIMEZONE_STORAGE_KEY = 'profile-timezone';

const TIMEZONES = [
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
] as const;

const COUNTRIES = [
  { code: 'UA', name: 'Украина', flag: 'https://flagcdn.com/w40/ua.png' },
  { code: 'RU', name: 'Россия', flag: 'https://flagcdn.com/w40/ru.png' },
  { code: 'BY', name: 'Беларусь', flag: 'https://flagcdn.com/w40/by.png' },
  { code: 'KZ', name: 'Казахстан', flag: 'https://flagcdn.com/w40/kz.png' },
  { code: 'US', name: 'США', flag: 'https://flagcdn.com/w40/us.png' },
  { code: 'DE', name: 'Германия', flag: 'https://flagcdn.com/w40/de.png' },
  { code: 'PL', name: 'Польша', flag: 'https://flagcdn.com/w40/pl.png' },
  { code: 'GB', name: 'Великобритания', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'FR', name: 'Франция', flag: 'https://flagcdn.com/w40/fr.png' },
  { code: 'OTHER', name: 'Другое', flag: null },
];

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
  twoFactorEnabled?: boolean;
}

const SIDEBAR_ITEMS = [
  { id: 'profile', label: 'Личный профиль', shortLabel: 'Профиль', href: '/profile?tab=profile', icon: User },
  { id: 'wallet', label: 'Кошелек', shortLabel: 'Кошелёк', href: '/profile?tab=wallet', icon: Wallet },
  { id: 'trade', label: 'Торговый профиль', shortLabel: 'Торги', href: '/profile?tab=trade', icon: TrendingUp },
  { id: 'support', label: 'Поддержка', shortLabel: 'Поддержка', href: '/profile?tab=support', icon: MessageCircle },
] as const;

function formatPhoneValue(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('380') && digits.length <= 12) {
    const rest = digits.slice(3);
    if (rest.length <= 2) return `+380 (${rest}`;
    if (rest.length <= 5) return `+380 (${rest.slice(0, 2)}) ${rest.slice(2)}`;
    return `+380 (${rest.slice(0, 2)}) ${rest.slice(2, 5)}-${rest.slice(5, 7)}-${rest.slice(7, 9)}`;
  }
  if (digits.startsWith('7') && digits.length <= 11) {
    const rest = digits.slice(1);
    if (rest.length <= 3) return `+7 (${rest}`;
    if (rest.length <= 6) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
    return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
  }
  return raw.startsWith('+') ? raw : `+${digits}`;
}

function parsePhoneToE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('380')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('7')) return `+${digits.slice(0, 11)}`;
  return digits ? `+${digits}` : '';
}

function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
      {label}
      <span className="group/tip relative inline-flex cursor-help">
        <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-white/50 hover:bg-white/20 hover:text-white/70 transition-colors">
          ?
        </span>
        <span className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1.5 bg-[#0f1a2e] border border-white/10 rounded-lg text-xs text-white/80 max-w-[220px] opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-20 shadow-xl pointer-events-none">
          {hint}
        </span>
      </span>
    </label>
  );
}

function PersonalProfileTab({ onProfileUpdate }: { onProfileUpdate?: (p: UserProfile) => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [lang, setLang] = useState('RU');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Kiev');
  const [showTimezoneMenu, setShowTimezoneMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) setLang(stored);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored && TIMEZONES.some((t) => t.value === stored)) setTimezone(stored);
  }, []);

  useEffect(() => {
    api<{ user: UserProfile }>('/api/user/profile')
      .then((res) => {
        setProfile(res.user);
        setFirstName(res.user.firstName || '');
        setLastName(res.user.lastName || '');
        setNickname(res.user.nickname || '');
        setPhone(res.user.phone || '');
        setCountry(res.user.country || 'UA');
        setDateOfBirth(res.user.dateOfBirth ? new Date(res.user.dateOfBirth).toISOString().slice(0, 10) : '');
      })
      .catch(() => setError('Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
      if (nickname.trim()) {
        const n = nickname.trim().startsWith('@') ? nickname.trim() : `@${nickname.trim()}`;
        if (!/^@[a-zA-Z0-9_]{5,20}$/.test(n)) {
          setError('Никнейм: формат @username, 5–20 символов (буквы, цифры, _)');
          setSaving(false);
          return;
        }
        body.nickname = n;
      }
      if (phone.trim()) {
        const p = phone.trim();
        if (!/^\+[1-9]\d{1,14}$/.test(p)) {
          setError('Телефон: формат +код страны и номер (например +380991234567)');
          setSaving(false);
          return;
        }
        body.phone = p;
      }
      if (country && country !== 'OTHER') body.country = country;
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;

      const res = await api<{ user: UserProfile }>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setProfile(res.user);
      setSuccess(true);
      onProfileUpdate?.(res.user);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: res.user }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      setError('Допустимые форматы: JPG, PNG');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Файл не должен превышать 2 МБ');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка загрузки');
      }
      const { avatarUrl } = await res.json();
      const updated = profile ? { ...profile, avatarUrl } : null;
      setProfile(updated);
      if (updated) {
        onProfileUpdate?.(updated);
        document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmEmail = async () => {
    setEmailConfirming(true);
    try {
      // TODO: Backend endpoint для отправки письма подтверждения
      await new Promise((r) => setTimeout(r, 800));
      setEmailVerified(true);
    } finally {
      setEmailConfirming(false);
    }
  };

  const handleLangChange = (code: string) => {
    setLang(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason) {
      setDeleteError('Укажите причину удаления');
      return;
    }
    if (!deletePassword || deletePassword.length < 8) {
      setDeleteError('Введите пароль (минимум 8 символов)');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api('/api/user/profile', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword, reason: deleteReason }),
      });
      await logout();
      router.push('/');
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      setDeleteError(err.response?.data?.message || err.message || 'Неверный пароль');
    } finally {
      setDeleting(false);
    }
  };

  const handleAvatarDelete = async () => {
    setUploading(true);
    setError(null);
    try {
      await api('/api/user/avatar', { method: 'DELETE' });
      setProfile((p) => (p ? { ...p, avatarUrl: null } : null));
      const updated = profile ? { ...profile, avatarUrl: null } : null;
      if (updated) {
        onProfileUpdate?.(updated);
        document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Процент заполнения и надёжности (для правой колонки)
  const profileFields = [
    !!profile?.avatarUrl,
    !!firstName.trim(),
    !!lastName.trim(),
    !!nickname.trim(),
    !!phone.trim(),
    !!country && country !== 'OTHER',
    !!dateOfBirth,
  ];
  const profileComplete = Math.round((profileFields.filter(Boolean).length / 7) * 100);
  const trustFactors = [
    !!profile?.twoFactorEnabled,
    !!phone.trim(),
    !!firstName.trim() && !!lastName.trim(),
    !!profile?.avatarUrl,
  ];
  const trustPercent = Math.round((trustFactors.filter(Boolean).length / 4) * 100);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col">
      <div className="flex flex-1 min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)]">
        {/* Левая колонка — форма */}
        <div className="flex-1 min-w-0 px-5 py-3 sm:p-6 md:p-8 overflow-auto">
        <h1 className="text-lg sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Личные данные</h1>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
            Профиль сохранён
          </div>
        )}

        {/* Аватар */}
        <div className="mb-5 sm:mb-8">
        <LabelWithHint label="Фото профиля" hint="JPG или PNG, до 2 МБ" />
        <div className="flex items-center gap-3 sm:gap-6 mt-2 sm:mt-3">
          <div className="relative">
            {profile?.avatarUrl ? (
              <img
                src={`${API_BASE}${profile.avatarUrl}`}
                alt=""
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-xl sm:text-3xl font-bold text-white shadow-lg ring-2 ring-white/20">
                {[firstName, lastName].filter(Boolean).join(' ').charAt(0) || profile?.email?.charAt(0) || '?'}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
            {profile?.avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                disabled={uploading}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
                Удалить
              </button>
            )}
          </div>
        </div>
      </div>

        {/* Поля формы — по два на строку */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <LabelWithHint label="Имя" hint="До 50 символов" />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Иван"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={50}
            />
          </div>
          <div>
            <LabelWithHint label="Фамилия" hint="До 50 символов" />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Иванов"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={50}
            />
          </div>
          <div>
            <LabelWithHint label="Никнейм" hint="5–20 символов, буквы, цифры и _" />
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="@username"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={21}
            />
          </div>
          <div>
            <LabelWithHint label="Телефон" hint="+380 (99) 123-45-67 или +7 (999) 123-45-67" />
            <input
              type="tel"
              value={formatPhoneValue(phone)}
              onChange={(e) => setPhone(parsePhoneToE164(e.target.value))}
              placeholder="+380 (__) ___-__-__"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
            />
          </div>
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Страна</label>
            <button
              type="button"
              onClick={() => setShowCountryMenu(!showCountryMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3">
                {COUNTRIES.find((c) => c.code === country)?.flag ? (
                  <img
                    src={COUNTRIES.find((c) => c.code === country)?.flag ?? ''}
                    alt=""
                    className="w-5 h-4 object-cover rounded-sm shrink-0"
                  />
                ) : (
                  <Globe className="w-5 h-4 shrink-0 text-white/50" />
                )}
                <span className="text-left">{COUNTRIES.find((c) => c.code === country)?.name || 'Выберите страну'}</span>
              </div>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showCountryMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCountryMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCountryMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountryMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-3 ${
                        country === c.code
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {c.flag ? (
                        <img src={c.flag} alt="" className="w-5 h-4 object-cover rounded-sm shrink-0" />
                      ) : (
                        <Globe className="w-5 h-4 shrink-0 text-white/50" />
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div>
            <LabelWithHint label="Дата рождения" hint="Только для пользователей 18+" />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 [color-scheme:dark]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Почта</label>
            <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="flex-1 min-w-0 sm:min-w-[200px] px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-xs sm:text-base text-white/70 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleConfirmEmail}
                disabled={emailConfirming || emailVerified}
                className="px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-[#3347ff]/20 hover:bg-[#3347ff]/30 text-[#7b8fff] font-medium text-[10px] sm:text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#3347ff]/30 flex items-center justify-center shrink-0 self-stretch"
              >
                {emailVerified ? 'Подтверждена' : emailConfirming ? 'Отправка...' : 'Подтвердить'}
              </button>
            </div>
            {emailVerified && <p className="mt-1 text-xs text-emerald-400/80">Письмо с подтверждением отправлено на почту</p>}
          </div>

          {/* Часовой пояс */}
          <div className="relative">
            <LabelWithHint label="Часовой пояс" hint="Для корректного отображения времени сделок" />
            <button
              type="button"
              onClick={() => setShowTimezoneMenu(!showTimezoneMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <span className="text-left">{TIMEZONES.find((t) => t.value === timezone)?.label || 'Киев (UTC+2)'}</span>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showTimezoneMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTimezoneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTimezoneMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {TIMEZONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        handleTimezoneChange(t.value);
                        setShowTimezoneMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                        timezone === t.value
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Язык интерфейса */}
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Язык интерфейса</label>
            <button
              type="button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={LANGUAGES.find((l) => l.code === lang)?.flag || '/images/flags/ru.svg'}
                  alt=""
                  className="w-5 h-4 object-cover rounded-sm shrink-0"
                />
                <span className="text-left">{LANGUAGES.find((l) => l.code === lang)?.label || 'Русский'}</span>
              </div>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguageMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        handleLangChange(l.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-3 ${
                        lang === l.code
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <img src={l.flag} alt="" className="w-5 h-4 object-cover rounded-sm shrink-0" />
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-4 rounded-lg sm:rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>

        {/* Безопасность */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/[0.06]">
          <h2 className="text-base sm:text-lg font-medium text-white mb-4 sm:mb-6">Безопасность</h2>
          <SecuritySection profile={profile} onProfileUpdate={(p) => { setProfile(prev => { const merged = prev ? { ...prev, ...p } : null; if (merged) onProfileUpdate?.(merged); return merged; }); }} />
        </div>

        {/* Удаление аккаунта */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/[0.06]">
          <p className="text-xs sm:text-sm font-medium text-white/50 mb-1.5 sm:mb-2">Опасная зона</p>
          <p className="text-[11px] sm:text-xs text-white/40 mb-3 sm:mb-4">Удаление аккаунта необратимо. Все данные будут удалены.</p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider border border-red-500/20 transition-colors"
          >
            Удалить аккаунт
          </button>
        </div>
        </div>

        {/* Правая колонка — виджеты (скрыта на мобилке) */}
        <div className="hidden md:flex w-72 shrink-0 p-6 border-l border-white/10 flex-col gap-6 bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f]">
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Заполненность профиля</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Прогресс</span>
                <span className="text-white font-semibold tabular-nums">{profileComplete}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#3347ff] rounded-full transition-all" style={{ width: `${profileComplete}%` }} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Заполните все поля для более полного профиля</p>
          </div>
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Надёжность аккаунта</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Уровень</span>
                <span className="text-white font-semibold tabular-nums">{trustPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${trustPercent}%` }} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">2FA, телефон, ФИО и аватар повышают надёжность</p>
          </div>
        </div>
      </div>

      {/* Модалка удаления */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !deleting && (setShowDeleteModal(false), setDeleteError(null), setDeleteReason(''), setDeletePassword(''))} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0f1a2e] border border-white/10 shadow-2xl">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 sm:mb-2">Удалить аккаунт</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4">Это действие необратимо. Все данные будут удалены.</p>

            <p className="text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2">Укажите причину</p>
            <div className="space-y-2 mb-4">
              {[
                { value: 'other_platform', label: 'Перехожу на другую платформу' },
                { value: 'not_using', label: 'Не пользуюсь сервисом' },
                { value: 'privacy', label: 'Хочу удалить личные данные' },
                { value: 'difficult', label: 'Сложно разобраться в интерфейсе' },
                { value: 'other', label: 'Другая причина' },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDeleteReason(r.value)}
                  className={`w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    deleteReason === r.value
                      ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                      : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p className="text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2">Введите пароль для подтверждения</p>
            {deleteError && <p className="mb-1.5 sm:mb-2 text-xs sm:text-sm text-red-400">{deleteError}</p>}
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-3 sm:mb-4"
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteReason(''); setDeletePassword(''); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function ProfileSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const activeTab = searchParams.get('tab') || 'profile';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      api<{ user: UserProfile }>('/api/user/profile'),
      api<AccountSnapshot>('/api/account/snapshot').catch(() => null),
    ]).then(([profileRes, snap]) => {
      setProfile(profileRes.user);
      setSnapshot(snap);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handler = () => fetchData();
    document.addEventListener('profile-updated', handler);
    document.addEventListener('wallet-updated', handler);
    return () => {
      document.removeEventListener('profile-updated', handler);
      document.removeEventListener('wallet-updated', handler);
    };
  }, []);

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.nickname || profile.email?.split('@')[0] || 'Пользователь'
    : 'Загрузка...';

  const countryCode = profile?.country && profile.country !== 'OTHER'
    ? profile.country
    : 'UA';
  const countryName = COUNTRIES.find((c) => c.code === countryCode)?.name ?? profile?.country ?? '—';

  return (
    <aside className="hidden md:flex w-[300px] shrink-0 flex-col h-full overflow-y-auto relative bg-[#051228] border-r border-white/[0.08]">

      {/* Верхний блок — аватар и данные */}
      <div className="px-4 pt-6 pb-3 font-sans antialiased">
        <div className="flex flex-col items-start text-left w-full">
          <div className="flex items-center gap-4 w-full mb-4 pl-3.5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60" />
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#051228] z-10" title="В сети" />
              {loading ? (
                <div className="relative w-16 h-16 rounded-full bg-white/10 animate-pulse" />
              ) : profile?.avatarUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || ''}${profile.avatarUrl}`}
                  alt=""
                  className="relative w-16 h-16 rounded-full object-cover ring-2 ring-white/20 ring-offset-2 ring-offset-[#051228] shadow-lg"
                />
              ) : (
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-2 ring-white/20 ring-offset-2 ring-offset-[#051228]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white truncate tracking-tight">
                {displayName}
              </h2>
              {profile?.nickname && (
                <p className="text-sm font-normal text-white/50 truncate mt-0.5">{profile.nickname}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <ReactCountryFlag
                  countryCode={countryCode}
                  svg
                  style={{ width: '1em', height: '1em', borderRadius: '2px' }}
                  title={countryName}
                />
                <span className="text-sm font-normal text-white/70 truncate">{countryName}</span>
              </div>
            </div>
          </div>

          <div className="w-full space-y-3 p-3.5">
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 shrink-0 text-white/50" strokeWidth={2.25} />
              <span className="text-sm font-normal text-white/60">
                {loading ? '—' : 'Уровень 1'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 shrink-0 text-white/50" strokeWidth={2.25} />
              <span className="text-sm font-normal text-white/90 truncate min-w-0" title={profile?.email}>
                {loading ? '—' : profile?.email || '—'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 shrink-0 text-white/50" strokeWidth={2.25} />
              <span className="text-sm font-normal text-white/80 tabular-nums">
                {loading ? '—' : snapshot?.accountId ? `#${snapshot.accountId.slice(0, 8)}` : profile?.id ? `#${profile.id.slice(0, 8)}` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 shrink-0 text-white/50" strokeWidth={2.25} />
              <span className="text-sm font-normal text-white/70">
                {loading ? '—' : profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 shrink-0 text-white/50" strokeWidth={2.25} />
              <span className="text-sm font-medium text-white tabular-nums">
                {loading ? '—' : snapshot ? formatBalance(snapshot.balance, snapshot.currency) : '—'}
              </span>
            </div>
            {snapshot?.type === 'DEMO' && (
              <div className="pt-1 border-t border-white/[0.04]">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#3347ff]/20 text-[#7b8fff]">
                  Демо-счёт
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Разделитель */}
      <div className="px-4 mt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#3347ff]/40 to-transparent" />
      </div>

      {/* Навигация */}
      <div className="flex-1 mt-6 px-4">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
          Разделы
        </p>
        <nav className="space-y-2">
          {SIDEBAR_ITEMS.map(({ id, label, href, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <Link
                key={id}
                href={href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium uppercase tracking-wider transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-[#3347ff]/20 to-transparent text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#3347ff] rounded-r" />
                )}
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors ${
                  isActive ? 'bg-[#3347ff]/30' : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Выход */}
      <div className="p-4 mt-auto border-t border-white/[0.08]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 text-xs font-medium uppercase tracking-wider"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          Выйти из аккаунта
        </button>
      </div>
    </aside>
  );
}

function ProfileBottomNav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around py-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-gradient-to-t from-[#05122a] via-[#06122c] to-[#0a1635]">
      {SIDEBAR_ITEMS.map(({ id, shortLabel, href, icon: Icon }, index) => {
        const isActive = activeTab === id;
        return (
          <Fragment key={id}>
            {index > 0 && <div className="w-px h-6 bg-white/15 shrink-0" aria-hidden />}
            <Link
              href={href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] transition-colors ${
                isActive ? 'text-[#7b8fff]' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={2.5} />
              <span className="text-[9px] font-semibold leading-tight">{shortLabel}</span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  return (
    <AuthGuard>
      <div className="h-screen flex flex-col overflow-hidden bg-[#061230]">
        <AppHeader />
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <ProfileSidebar />
          <main className="flex-1 min-w-0 overflow-auto pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {activeTab === 'profile' && <PersonalProfileTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'trade' && <TradeProfileTab />}
            {activeTab === 'support' && <SupportTab />}
          </main>
        </div>
        <ProfileBottomNav />
      </div>
    </AuthGuard>
  );
}
