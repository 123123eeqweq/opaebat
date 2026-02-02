'use client';

import { useState } from 'react';
import { Shield, Lock, KeyRound, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api/api';

interface UserProfile {
  twoFactorEnabled?: boolean;
  email?: string;
}

interface SecuritySectionProps {
  profile: UserProfile | null;
  onProfileUpdate?: (p: UserProfile) => void;
}

export function SecuritySection({ profile, onProfileUpdate }: SecuritySectionProps) {
  // Смена пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA
  const [step2FA, setStep2FA] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [enable2FALoading, setEnable2FALoading] = useState(false);
  const [verify2FALoading, setVerify2FALoading] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FALoading, setDisable2FALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFASuccess, setTwoFASuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Новый пароль должен быть не менее 8 символов');
      return;
    }
    setPasswordSaving(true);
    try {
      await api('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setPasswordError(e.response?.data?.message || e.message || 'Ошибка смены пароля');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setTwoFAError(null);
    setEnable2FALoading(true);
    try {
      const res = await api<{ qrCode: string; backupCodes: string[] }>('/api/user/2fa/enable', {
        method: 'POST',
      });
      setQrCode(res.qrCode);
      setBackupCodes(res.backupCodes);
      setStep2FA('qr');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setTwoFAError(e.message || 'Ошибка включения 2FA');
    } finally {
      setEnable2FALoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError(null);
    setVerify2FALoading(true);
    try {
      await api('/api/user/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode }),
      });
      setTwoFASuccess('2FA успешно включена');
      setStep2FA('idle');
      setVerifyCode('');
      setQrCode(null);
      setBackupCodes([]);
      const updated = { ...profile, twoFactorEnabled: true };
      onProfileUpdate?.(updated);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      setTimeout(() => setTwoFASuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setTwoFAError(e.message || 'Неверный код. Попробуйте снова.');
    } finally {
      setVerify2FALoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAError(null);
    setTwoFASuccess(null);
    if (!disable2FAPassword || !disable2FACode) {
      setTwoFAError('Введите пароль и код из приложения');
      return;
    }
    setDisable2FALoading(true);
    try {
      await api('/api/user/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: disable2FAPassword, code: disable2FACode }),
      });
      setTwoFASuccess('2FA отключена');
      setDisable2FAPassword('');
      setDisable2FACode('');
      const updated = { ...profile, twoFactorEnabled: false };
      onProfileUpdate?.(updated);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      setTimeout(() => setTwoFASuccess(null), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setTwoFAError(e.response?.data?.message || e.message || 'Ошибка отключения 2FA');
    } finally {
      setDisable2FALoading(false);
    }
  };

  const handleCopyBackupCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(idx);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const cancel2FASetup = () => {
    setStep2FA('idle');
    setQrCode(null);
    setBackupCodes([]);
    setVerifyCode('');
    setTwoFAError(null);
  };

  return (
    <>
      {/* Смена пароля */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-white/60" strokeWidth={2} />
          <h2 className="text-lg font-medium text-white">Смена пароля</h2>
        </div>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={128}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Подтвердите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={128}
              required
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-400">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-emerald-400">Пароль успешно изменён</p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {passwordSaving ? 'Сохранение...' : 'Изменить пароль'}
          </button>
        </form>
      </section>

      {/* 2FA */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-white/60" strokeWidth={2} />
          <h2 className="text-lg font-medium text-white">Двухфакторная аутентификация (2FA)</h2>
        </div>

        {twoFAError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {twoFAError}
          </div>
        )}
        {twoFASuccess && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {twoFASuccess}
          </div>
        )}

        {profile?.twoFactorEnabled ? (
          <>
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>2FA включена. Ваш аккаунт защищён дополнительным кодом при входе.</span>
            </div>
            <form onSubmit={handleDisable2FA} className="max-w-md space-y-4">
              <p className="text-sm text-white/60">Для отключения 2FA введите пароль и текущий код из приложения.</p>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Пароль</label>
                <input
                  type="password"
                  value={disable2FAPassword}
                  onChange={(e) => setDisable2FAPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Код из приложения</label>
                <input
                  type="text"
                  value={disable2FACode}
                  onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 font-mono text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={disable2FALoading}
                className="px-6 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50 border border-red-500/30"
              >
                {disable2FALoading ? 'Отключение...' : 'Отключить 2FA'}
              </button>
            </form>
          </>
        ) : step2FA === 'qr' ? (
          <div className="max-w-md space-y-6">
            <p className="text-sm text-white/70">
              Отсканируйте QR-код в приложении для аутентификации (Google Authenticator, Authy и др.):
            </p>
            {qrCode && (
              <div className="p-4 rounded-xl bg-white inline-block">
                <img src={qrCode} alt="QR-код" className="w-48 h-48" />
              </div>
            )}
            {backupCodes.length > 0 && (
              <div>
                <p className="text-sm text-white/70 mb-2">Сохраните резервные коды в надёжном месте. Каждый код можно использовать один раз.</p>
                <div className="flex flex-wrap gap-2">
                  {backupCodes.map((code, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleCopyBackupCode(code, i)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 font-mono text-xs hover:bg-white/10 transition-colors"
                    >
                      {code}
                      {copiedCode === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-white/50" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Введите код из приложения</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 font-mono text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={verify2FALoading}
                  className="px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {verify2FALoading ? 'Проверка...' : 'Подтвердить'}
                </button>
                <button
                  type="button"
                  onClick={cancel2FASetup}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium uppercase tracking-wider transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="max-w-md">
            <p className="text-sm text-white/60 mb-4">
              Добавьте дополнительный уровень защиты. При входе потребуется код из приложения.
            </p>
            <button
              type="button"
              onClick={handleEnable2FA}
              disabled={enable2FALoading}
              className="px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {enable2FALoading ? 'Загрузка...' : 'Включить 2FA'}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
