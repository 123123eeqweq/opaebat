'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, ExternalLink, History, ChevronDown, ChevronUp, ChevronRight, Shield } from 'lucide-react';
import { api } from '@/lib/api/api';

type PaymentMethodId =
  | 'CARD'
  | 'PRIVAT24'
  | 'CARD_UAH'
  | 'BINANCE_PAY'
  | 'USDT_TRC20'
  | 'BTC'
  | 'ETH'
  | 'USDC'
  | 'BNB'
  | 'XRP'
  | 'SOL'
  | 'DOGE'
  | 'ADA'
  | 'AVAX'
  | 'MATIC'
  | 'LTC'
  | 'DOT';

const PAYMENT_METHODS: Array<{
  id: PaymentMethodId;
  label: string;
  mask?: string;
  image?: string;
  speed: string;
}> = [
  { id: 'CARD', label: 'Карта Visa/Master', image: '/images/visa%20master.webp', speed: 'Мгновенно' },
  { id: 'PRIVAT24', label: 'Privat24', image: '/images/privat24.png', speed: 'Мгновенно' },
  { id: 'CARD_UAH', label: 'Перевод на карту (UAH)', image: '/images/creditcard.png', speed: '1–5 мин' },
  { id: 'BINANCE_PAY', label: 'Binance Pay', image: '/images/binancepay.png', speed: 'Мгновенно' },
  { id: 'USDT_TRC20', label: 'Tether (TRC-20)', image: '/images/tether.png', speed: '1–5 мин' },
  { id: 'BTC', label: 'Bitcoin', speed: '1–5 мин' },
  { id: 'ETH', label: 'Ethereum', speed: '1–5 мин' },
  { id: 'USDC', label: 'USD Coin', speed: '1–5 мин' },
  { id: 'BNB', label: 'BNB', speed: '1–5 мин' },
  { id: 'XRP', label: 'XRP', speed: '1–5 мин' },
  { id: 'SOL', label: 'Solana', speed: '1–5 мин' },
  { id: 'DOGE', label: 'Dogecoin', speed: '1–5 мин' },
  { id: 'ADA', label: 'Cardano', speed: '1–5 мин' },
  { id: 'AVAX', label: 'Avalanche', speed: '1–5 мин' },
  { id: 'MATIC', label: 'Polygon', speed: '1–5 мин' },
  { id: 'LTC', label: 'Litecoin', speed: '1–5 мин' },
  { id: 'DOT', label: 'Polkadot', speed: '1–5 мин' },
];

const WITHDRAW_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) =>
  ['CARD', 'PRIVAT24', 'CARD_UAH', 'BINANCE_PAY', 'USDT_TRC20'].includes(m.id)
);

const MIN_AMOUNT_UAH = 200;
const MAX_AMOUNT_UAH = 1000;
const QUICK_AMOUNTS = [200, 500, 1000];

const METHOD_LABELS: Record<string, string> = {
  CARD: 'Карта Visa/Master',
  PRIVAT24: 'Privat24',
  CARD_UAH: 'Перевод на карту (UAH)',
  BINANCE_PAY: 'Binance Pay',
  USDT_TRC20: 'Tether (TRC-20)',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDC: 'USD Coin',
  BNB: 'BNB',
  XRP: 'XRP',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  MATIC: 'Polygon',
  LTC: 'Litecoin',
  DOT: 'Polkadot',
};

interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  date: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
}

export function WalletTab() {
  const [balance, setBalance] = useState<{ currency: string; balance: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('CARD');
  const [amount, setAmount] = useState('500');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const [withdrawPaymentMethod, setWithdrawPaymentMethod] = useState<PaymentMethodId>('CARD');
  const [withdrawAmount, setWithdrawAmount] = useState('200');
  const [methodsExpanded, setMethodsExpanded] = useState(false);

  const WALLET_TABS = [
    { id: 'deposit' as const, label: 'Пополнение' },
    { id: 'withdraw' as const, label: 'Вывод' },
    { id: 'history' as const, label: 'История транзакций' },
  ];

  const fetchBalance = () => {
    api<{ currency: string; balance: number }>('/api/wallet/balance')
      .then((res) => setBalance(res))
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = () => {
    api<{ transactions: WalletTransaction[] }>('/api/wallet/transactions')
      .then((res) => setTransactions(res.transactions || []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [walletTab]);

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_AMOUNT_UAH && numAmount <= MAX_AMOUNT_UAH;
  const displayAmount = isValidAmount ? numAmount : 0;
  const totalPay = displayAmount;

  const handleDeposit = async () => {
    if (!isValidAmount) {
      setError(`Сумма пополнения: от ${MIN_AMOUNT_UAH} до ${MAX_AMOUNT_UAH} UAH`);
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api<{ transactionId: string; status: string; amount: number; currency: string }>(
        '/api/wallet/deposit',
        {
          method: 'POST',
          body: JSON.stringify({ amount: numAmount, paymentMethod }),
        }
      );
      setSuccess(true);
      setAmount('500');
      setPromoCode('');
      setPromoApplied(false);
      fetchBalance();
      fetchTransactions();
      document.dispatchEvent(new CustomEvent('wallet-updated'));
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string; error?: string } } };
      setError(err.response?.data?.message || err.message || 'Ошибка пополнения');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(true);
  };

  const withdrawNumAmount = parseFloat(withdrawAmount) || 0;
  const isValidWithdraw = withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH && (balance?.balance ?? 0) >= withdrawNumAmount;

  const handleWithdraw = async () => {
    if (!isValidWithdraw) {
      setError(
        withdrawNumAmount < MIN_AMOUNT_UAH || withdrawNumAmount > MAX_AMOUNT_UAH
          ? `Сумма вывода: от ${MIN_AMOUNT_UAH} до ${MAX_AMOUNT_UAH} UAH`
          : 'Недостаточно средств на счёте'
      );
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api<{ transactionId: string; status: string; amount: number; currency: string }>(
        '/api/wallet/withdraw',
        {
          method: 'POST',
          body: JSON.stringify({ amount: withdrawNumAmount, paymentMethod: withdrawPaymentMethod }),
        }
      );
      setSuccess(true);
      setWithdrawAmount('200');
      fetchBalance();
      fetchTransactions();
      document.dispatchEvent(new CustomEvent('wallet-updated'));
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string; error?: string } } };
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Ошибка вывода');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
  const selectedWithdrawMethod = WITHDRAW_PAYMENT_METHODS.find((m) => m.id === withdrawPaymentMethod);

  return (
    <div className="flex flex-row w-full min-h-full">
      {/* Левая часть: табы + контент */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Табы */}
        <div className="shrink-0 flex border-b border-white/[0.08] px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 overflow-x-auto overflow-y-hidden">
          {WALLET_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setWalletTab(id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                walletTab === id
                  ? 'border-[#3347ff] text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="flex flex-1 min-h-0 overflow-auto">
        {walletTab === 'deposit' && (
          <>
            {/* Левая колонка — форма */}
            <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-auto">
              <div className="w-full">
                <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Пополнение счёта</h1>
          <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
            Выберите способ оплаты и введите сумму для безопасного пополнения.
          </p>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
              Депозит успешно создан. Средства поступят после подтверждения платёжной системой.
            </div>
          )}

          {/* 1. Выбор способа оплаты */}
          <div className="mb-5 sm:mb-8 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0f1a2e]/60 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">
                1
              </span>
              <h2 className="text-base font-semibold text-white">Выберите способ оплаты</h2>
            </div>
            <div>
              <div className="relative">
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 transition-all duration-300 ${
                    methodsExpanded ? 'max-h-none' : 'max-h-[230px] overflow-hidden'
                  }`}
                >
                {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m.id;
                const isInstant = m.speed === 'Мгновенно';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`relative flex flex-row items-center gap-3 p-3 rounded-lg text-left border border-white/[0.06] border-l-[3px] ${
                      isSelected
                        ? 'bg-white/[0.04] border-l-[#3347ff] border-white/20'
                        : 'bg-white/[0.02] border-l-transparent'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 overflow-hidden ${
                      isSelected ? 'bg-white/8' : 'bg-white/[0.04]'
                    }`}>
                      {m.image ? (
                        <img src={m.image} alt="" className="w-10 h-10 object-contain rounded-lg" />
                      ) : (
                        <span className="text-lg font-medium text-white/50">{m.label.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {m.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          isInstant
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                            : 'text-white/60 bg-white/5 border-white/10'
                        }`}>
                          {m.speed}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-white/70 bg-white/5 border border-white/10">
                          {MIN_AMOUNT_UAH}–{MAX_AMOUNT_UAH} UAH
                        </span>
                      </div>
                    </div>
                  </button>
                );
                })}
                </div>
                {!methodsExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0f1a2e] via-[#0f1a2e]/80 to-transparent pointer-events-none" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setMethodsExpanded((v) => !v)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium uppercase tracking-wider bg-white/10 border border-white/10 text-white hover:bg-white/15 hover:border-white/20 transition-colors"
              >
                {methodsExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Свернуть
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Развернуть
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Ввод суммы */}
          <div className="mb-5 sm:mb-8 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0f1a2e]/60 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">
                2
              </span>
              <h2 className="text-sm font-semibold text-white">Введите сумму</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                  Сумма пополнения (UAH)
                </label>
                <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                  <span className="flex items-center pl-2 sm:pl-3 text-white/50 text-xs sm:text-sm">UAH</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    min={MIN_AMOUNT_UAH}
                    max={MAX_AMOUNT_UAH}
                    step="1"
                    className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 bg-transparent text-sm sm:text-base text-white placeholder-white/30 focus:outline-none"
                  />
                  <span className="flex items-center pr-3 text-white/40 text-xs">UAH</span>
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                      amount === String(a)
                        ? 'bg-[#3347ff] text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {a.toLocaleString()} UAH
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoApplied(false);
                  }}
                  placeholder="Промо-код (необязательно)"
                  className="flex-1 min-w-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Применить
                </button>
              </div>
            </div>
          </div>

          {/* Кнопка оплаты — на мобилке (на десктопе в сайдбаре) */}
          <div className="lg:hidden mb-5 sm:mb-8">
            <div className="rounded-lg sm:rounded-xl border border-white/[0.08] bg-[#0f1a2e]/80 p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60 text-sm">К оплате</span>
                <span className="text-lg font-bold text-[#3347ff] tabular-nums">{totalPay.toFixed(0)} UAH</span>
              </div>
              <button
                type="button"
                onClick={handleDeposit}
                disabled={submitting || !isValidAmount}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl btn-accent text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    Перейти к оплате
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Список последних депозитов */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Последние пополнения</h2>
              <button
                type="button"
                className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
              >
                Все
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              {txLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                </div>
              ) : transactions.filter((t) => t.type === 'DEPOSIT').length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">Нет пополнений</div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Дата</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Способ</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Статус</th>
                      <th className="text-right py-3 px-4 text-white/50 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter((tx) => tx.type === 'DEPOSIT')
                      .map((tx) => (
                        <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-3 px-4 text-white/80">
                            {new Date(tx.date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {METHOD_LABELS[tx.method] || tx.method}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                tx.status === 'CONFIRMED'
                                  ? 'text-emerald-400'
                                  : tx.status === 'PENDING'
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                              }
                            >
                              {tx.status === 'CONFIRMED'
                                ? 'Завершено'
                                : tx.status === 'PENDING'
                                  ? 'В обработке'
                                  : 'Ошибка'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400 tabular-nums">
                            +{tx.amount.toFixed(0)} UAH
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

          </>
        )}

        {walletTab === 'withdraw' && (
          <>
            <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-auto">
              <div className="w-full">
                <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Вывод средств</h1>
                <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
                  Выберите способ вывода и введите сумму.
                </p>

                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    Заявка на вывод создана. Средства будут переведены в течение 1–3 рабочих дней.
                  </div>
                )}

                {/* 1. Выбор способа */}
                <div className="mb-5 sm:mb-8 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0f1a2e]/60 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">1</span>
                    <h2 className="text-base font-semibold text-white">Способ вывода</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WITHDRAW_PAYMENT_METHODS.map((m) => {
                      const isSelected = withdrawPaymentMethod === m.id;
                      const isInstant = m.speed === 'Мгновенно';
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setWithdrawPaymentMethod(m.id)}
                          className={`relative flex flex-row items-center gap-3 p-3 rounded-lg text-left border border-white/[0.06] border-l-[3px] ${
                            isSelected
                              ? 'bg-white/[0.04] border-l-[#3347ff] border-white/20'
                              : 'bg-white/[0.02] border-l-transparent'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 overflow-hidden ${
                            isSelected ? 'bg-white/8' : 'bg-white/[0.04]'
                          }`}>
                            {m.image ? (
                              <img src={m.image} alt="" className="w-10 h-10 object-contain rounded-lg" />
                            ) : (
                              <span className="text-lg font-medium text-white/50">{m.label.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                              {m.label}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                isInstant
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                  : 'text-white/60 bg-white/5 border-white/10'
                              }`}>
                                {m.speed}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-white/70 bg-white/5 border border-white/10">
                                {MIN_AMOUNT_UAH}–{MAX_AMOUNT_UAH} UAH
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Сумма */}
                <div className="mb-5 sm:mb-8 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0f1a2e]/60 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">2</span>
                    <h2 className="text-sm font-semibold text-white">Сумма вывода</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                        Сумма (UAH)
                      </label>
                      <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                        <span className="flex items-center pl-2 sm:pl-3 text-white/50 text-xs sm:text-sm">UAH</span>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="200"
                          min={MIN_AMOUNT_UAH}
                          max={MAX_AMOUNT_UAH}
                          step="1"
                          className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 bg-transparent text-sm sm:text-base text-white placeholder-white/30 focus:outline-none"
                        />
                        <span className="flex items-center pr-3 text-white/40 text-xs">UAH</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-white/40">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH. Доступно: {(balance?.balance ?? 0).toFixed(0)} UAH</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setWithdrawAmount(String(a))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                            withdrawAmount === String(a)
                              ? 'bg-[#3347ff] text-white'
                              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {a.toLocaleString()} UAH
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Кнопка вывода — на мобилке */}
              <div className="lg:hidden mt-5 sm:mt-8">
                <div className="rounded-lg sm:rounded-xl border border-white/[0.08] bg-[#0f1a2e]/80 p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">К получению</span>
                    <span className="text-lg font-bold text-[#3347ff] tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={submitting || !isValidWithdraw}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-accent text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      'Подтвердить вывод'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {walletTab === 'history' && (
          <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-auto w-full">
            <div className="w-full">
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">История транзакций</h1>
              <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
                Все пополнения и выводы средств
              </p>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0f1a2e]/60 overflow-hidden">
                {txLoading ? (
                  <div className="p-16 flex justify-center">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/50">Нет транзакций</p>
                    <p className="text-sm text-white/40 mt-1">Пополнения и выводы появятся здесь</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Дата</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Тип</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Способ</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Статус</th>
                          <th className="text-right py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const isDeposit = tx.type === 'DEPOSIT';
                          return (
                            <tr
                              key={tx.id}
                              className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-4 px-5">
                                <span className="text-white/90 text-sm">
                                  {new Date(tx.date).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    isDeposit
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {isDeposit ? 'Пополнение' : 'Вывод'}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-white/80 text-sm">
                                {METHOD_LABELS[tx.method] || tx.method}
                              </td>
                              <td className="py-4 px-5">
                                <span
                                  className={`text-sm font-medium ${
                                    tx.status === 'CONFIRMED'
                                      ? 'text-emerald-400'
                                      : tx.status === 'PENDING'
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                  }`}
                                >
                                  {tx.status === 'CONFIRMED'
                                    ? 'Завершено'
                                    : tx.status === 'PENDING'
                                      ? 'В обработке'
                                      : 'Ошибка'}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right">
                                <span
                                  className={`font-semibold tabular-nums text-sm ${
                                    isDeposit ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {isDeposit ? '+' : '−'}{tx.amount.toFixed(0)} UAH
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Правая часть — Summary (от хедера до низа, только для Пополнение и Вывод) */}
      {(walletTab === 'deposit' || walletTab === 'withdraw') && (
        <div className="hidden lg:flex w-[360px] shrink-0 p-6 flex-col gap-6 self-stretch min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f] border-l border-white/10 sticky top-0">
          {walletTab === 'deposit' && (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-[#0f1a2e]/80 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Итого</h3>
                  <p className="text-xs text-white/50 mt-0.5">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Способ</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedMethod?.mask || selectedMethod?.label || paymentMethod}
                      </span>
                      {selectedMethod?.speed && (
                        <span className="text-xs text-white/50">{selectedMethod.speed}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Сумма</span>
                    <span className="text-white font-medium tabular-nums">
                      {displayAmount.toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Комиссия</span>
                    <span className="text-emerald-400 font-medium">Бесплатно</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">К оплате</span>
                    <span className="text-xl font-bold text-[#3347ff] tabular-nums">
                      {totalPay.toFixed(0)} UAH
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={submitting || !isValidAmount}
                  className="group relative w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        Перейти к оплате
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  Нажимая «Подтвердить», вы соглашаетесь с{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">Условиями использования</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">Безопасный платёж</p>
                  <p className="text-xs text-white/50 mt-0.5">256-bit SSL шифрование. Ваши данные защищены.</p>
                </div>
              </div>
              <a href="#" className="block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors">
                <img src="/images/banner1.PNG" alt="" className="w-full h-auto object-cover rounded-xl" />
              </a>
            </>
          )}
          {walletTab === 'withdraw' && (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-[#0f1a2e]/80 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Итого</h3>
                  <p className="text-xs text-white/50 mt-0.5">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Способ</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedWithdrawMethod?.mask || selectedWithdrawMethod?.label || withdrawPaymentMethod}
                      </span>
                      {selectedWithdrawMethod?.speed && (
                        <span className="text-xs text-white/50">{selectedWithdrawMethod.speed}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Сумма</span>
                    <span className="text-white font-medium tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Комиссия</span>
                    <span className="text-emerald-400 font-medium">Бесплатно</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">К получению</span>
                    <span className="text-xl font-bold text-[#3347ff] tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={submitting || !isValidWithdraw}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    'Подтвердить вывод'
                  )}
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  Нажимая «Подтвердить», вы соглашаетесь с{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">Условиями использования</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">Безопасный вывод</p>
                  <p className="text-xs text-white/50 mt-0.5">256-bit SSL шифрование. Ваши данные защищены.</p>
                </div>
              </div>
              <a href="#" className="block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors">
                <img src="/images/banner1.PNG" alt="" className="w-full h-auto object-cover rounded-xl" />
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
