'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

type ProfileTab = 'profile' | 'wallet' | 'trade' | 'support';
type PaymentMethod = 'card' | 'crypto' | 'bank';

const QUICK_AMOUNTS = [100, 250, 1000, 5000];

const HELP_TOPICS = [
  {
    id: 'account',
    title: 'Account Management',
    description: 'Verification, Profile details, Password resets, and account security settings.',
    icon: UserCog,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'deposits',
    title: 'Deposits & Withdrawals',
    description: 'Payment methods, processing times, transaction limits, and troubleshooting.',
    icon: ArrowUpSquare,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'trading',
    title: 'Trading Platforms',
    description: 'WebTrader, Mobile App, MT4/5 setup, connection issues, and chart tools.',
    icon: Monitor,
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    id: 'markets',
    title: 'Markets & Instruments',
    description: 'Forex, Stocks, Commodities, spreads, trading hours, and margin requirements.',
    icon: BarChart2,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    id: 'education',
    title: 'Education & Glossary',
    description: 'Trading guides, terminology, webinars, and market analysis tutorials.',
    icon: GraduationCap,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    description: '2FA setup, privacy policy, suspicious activity reporting, and data protection.',
    icon: Shield,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
  },
];

function TabProfile() {
  const [firstName, setFirstName] = useState('User');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('Ukraine');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Left column */}
      <div className="lg:w-80 shrink-0 space-y-4">
        {/* User Profile Card */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <span className="absolute -top-1 -right-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
              Verified
            </span>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#3347ff] flex items-center justify-center hover:bg-[#3347ff]/90 transition-colors"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          </div>
          <h3 className="mt-4 font-semibold text-white text-lg">User Name</h3>
          <p className="text-sm text-gray-400">ID: 8839201</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-3 py-1 text-xs rounded-lg bg-white/10 text-gray-400 border border-white/10">
              LEVEL Standard
            </span>
            <span className="px-3 py-1 text-xs rounded-lg bg-white/10 text-gray-400 border border-white/10">
              REGION UKR
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Info</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">Email Address</p>
                <p className="text-white truncate">user@ex...</p>
              </div>
              <span className="text-[10px] font-medium text-emerald-400 shrink-0">Verified</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">Phone Number</p>
                <p className="text-white">+380 99 ***** 99</p>
              </div>
              <button type="button" className="text-xs text-[#3347ff] hover:underline shrink-0">
                CHANGE
              </button>
            </div>
          </div>
        </div>

        {/* Last Login */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last Login
            </h4>
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-sm text-white">Windows 10</p>
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Personal Data */}
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3347ff]/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#3347ff]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Personal Data</h3>
                <p className="text-sm text-gray-400">Manage your personal information and profile details.</p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#3347ff] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#3347ff]/90 transition-colors shrink-0"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-[#3347ff] uppercase tracking-wider mb-3 pb-1 border-b border-[#3347ff]/30">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter Last Name"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="@ nickname"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="DD.MM.YYYY"
                      className="w-full px-3 py-2 pr-10 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#3347ff] uppercase tracking-wider mb-3 pb-1 border-b border-[#3347ff]/30">
                Location Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  >
                    <option value="Ukraine" className="bg-[#0a1635]">Ukraine</option>
                    <option value="Russia" className="bg-[#0a1635]">Russia</option>
                    <option value="Other" className="bg-[#0a1635]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter City"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, House, Apt"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Status & Verification row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Status */}
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Security Status
              </h3>
              <span className="px-2 py-0.5 text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                Good
              </span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Protection Level</span>
                <span className="text-white font-semibold">85%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[85%] rounded-full bg-[#3347ff]" />
              </div>
              <p className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Enable 2FA to reach 100% security.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-white">Password</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Last changed 3 months ago</p>
                <button type="button" className="text-xs text-[#3347ff] hover:underline font-medium">
                  Update
                </button>
              </div>
            </div>
          </div>

          {/* Verification */}
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Check className="w-5 h-5 text-[#3347ff]" />
                Verification
              </h3>
              <span className="text-sm text-gray-400">Step 2 of 3</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Confirm Email</p>
                  <p className="text-xs text-gray-400">Completed on Oct 24</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#3347ff] flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white mb-3">Identity Check</p>
                  <button
                    type="button"
                    className="w-full py-4 px-4 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center gap-2 text-gray-400 hover:border-[#3347ff]/50 hover:text-[#3347ff] transition-colors"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Upload Passport or ID</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Max size 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabWallet() {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [amount, setAmount] = useState<string>('1000');
  const [promo, setPromo] = useState<string>('');
  const amountNum = parseFloat(amount.replace(/\s/g, '')) || 0;
  const fee = 0;
  const total = amountNum + fee;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Add Funds</h2>
        <p className="text-gray-400 mt-1">
          Select a payment method and enter amount to proceed securely.
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <section className="rounded-xl bg-[#0a1635] border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3347ff] flex items-center justify-center text-white font-bold text-sm">1</div>
              <h3 className="text-lg font-semibold text-white">Select Payment Method</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'card' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                }`}
              >
                {method === 'card' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <CreditCard className="w-10 h-10 text-[#3347ff] mb-2" />
                <span className="font-semibold text-white">Card Payment</span>
                <span className="text-sm text-gray-400">Instant • No Fee</span>
                <div className="flex gap-2 mt-2">
                  <div className="w-10 h-6 rounded bg-white/20" />
                  <div className="w-10 h-6 rounded bg-white/20" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'crypto' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                }`}
              >
                {method === 'crypto' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Bitcoin className="w-10 h-10 text-amber-500 mb-2" />
                <span className="font-semibold text-white">Crypto</span>
                <span className="text-sm text-gray-400">BTC, ETH, USDT</span>
                <div className="flex gap-1.5 mt-2">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">TRC20</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400">ERC20</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-colors ${
                  method === 'bank' ? 'border-[#3347ff] bg-[#3347ff]/10' : 'border-white/20 bg-white/5 hover:border-white/30'
                }`}
              >
                {method === 'bank' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#3347ff] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Landmark className="w-10 h-10 text-violet-400 mb-2" />
                <span className="font-semibold text-white">Bank Wire</span>
                <span className="text-sm text-gray-400">1-3 Business Days</span>
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
              <label className="block text-xs uppercase tracking-wider text-gray-400">Deposit Amount (USD)</label>
              <div className="flex border border-white/20 rounded-lg overflow-hidden bg-white/5">
                <span className="px-4 py-3 text-gray-400 border-r border-white/20">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))}
                  className="flex-1 px-4 py-3 bg-transparent text-white placeholder-gray-500 min-w-0"
                  placeholder="0"
                />
                <span className="px-4 py-3 text-gray-400 border-l border-white/20">USD</span>
              </div>
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
                  placeholder="Promo Code (Optional)"
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm"
                />
                <button type="button" className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors">
                  Apply
                </button>
              </div>
            </div>
          </section>
        </div>
        <div className="lg:w-96 shrink-0 space-y-4">
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Summary</h3>
              <Receipt className="w-5 h-5 text-gray-400" />
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Method</dt>
                <dd className="text-white">
                  {method === 'card' && 'VISA **** 4242'}
                  {method === 'crypto' && 'Crypto (USDT)'}
                  {method === 'bank' && 'Bank Wire'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Amount</dt>
                <dd className="text-white">${amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Fee</dt>
                <dd className="text-emerald-400">Free</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10">
                <dt className="text-gray-400 font-medium">Total Pay</dt>
                <dd className="text-[#3347ff] font-bold text-lg">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="w-full mt-4 py-3 px-4 rounded-lg bg-[#3347ff] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#3347ff]/90 transition-colors"
            >
              Confirm Deposit
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-3 text-xs text-gray-500 text-center">
              By clicking Confirm, you agree to the{' '}
              <Link href="/policy/terms" className="text-[#3347ff] hover:underline">Terms of Service</Link>.
            </p>
          </div>
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Secure Payment</h4>
              <p className="text-sm text-gray-400 mt-0.5">256-bit SSL Encryption. Your data is safe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabSupport() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white">How can we assist you?</h2>
        <p className="text-gray-400 mt-2">Search our knowledge base or browse help categories below.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Describe your issue (e.g. 'verification failed', 'withdraw funds')"
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#0a1635] border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
          />
        </div>
        <button
          type="button"
          className="px-6 py-3 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#3347ff]/90 transition-colors shrink-0"
        >
          Search
        </button>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-[#3347ff] rounded-full" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Browse Help Topics</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HELP_TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <button
              key={topic.id}
              type="button"
              className="rounded-xl bg-[#0a1635] border border-white/10 p-5 text-left hover:border-white/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className={`w-10 h-10 rounded-full ${topic.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${topic.iconColor}`} />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white shrink-0" />
              </div>
              <h4 className="font-semibold text-white mb-1">{topic.title}</h4>
              <p className="text-sm text-gray-400 leading-relaxed">{topic.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TRADE_RANGE_BTNS = ['1W', '1M', '3M', 'YTD'] as const;
type TradeRange = (typeof TRADE_RANGE_BTNS)[number];
const TRADE_CHART_POINTS = [
  { x: 0, y: 85 },
  { x: 18, y: 78 },
  { x: 35, y: 65 },
  { x: 50, y: 50 },
  { x: 65, y: 35 },
  { x: 82, y: 18 },
  { x: 100, y: 5 },
];
const TRADE_CHART_DATES = ['NOV 01', 'NOV 05', 'NOV 10', 'NOV 15', 'NOV 20', 'NOV 25', 'NOV 30'];

function TabTrade() {
  const [range, setRange] = useState<TradeRange>('1M');

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-8">Торговля</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded">+12%</span>
          <RefreshCw className="w-8 h-8 text-[#3347ff] mb-3" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Trades</p>
          <p className="text-2xl font-bold text-white mt-1">1,842</p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded">Good</span>
          <div className="relative w-8 h-8">
            <svg className="absolute inset-0 w-full h-full text-gray-600" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="16" cy="16" r="14" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="2" strokeDasharray="60 28" strokeLinecap="round" transform="rotate(-90 16 16)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">Win Rate</p>
          <p className="text-2xl font-bold text-white mt-1">68.5%</p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
          <BarChart2 className="w-8 h-8 text-[#3347ff] mb-3" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trading Volume</p>
          <p className="text-2xl font-bold text-white mt-1">$4.2M</p>
        </div>
        <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5 relative overflow-hidden">
          <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded whitespace-nowrap">+$850 this week</span>
          <ArrowUpSquare className="w-8 h-8 text-[#3347ff] mb-3" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Profit</p>
          <p className="text-2xl font-bold text-white mt-1">$8,420.50</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-xl bg-[#0a1635] border border-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#3347ff]" />
              <div>
                <h3 className="text-lg font-semibold text-white">Profit Performance</h3>
                <p className="text-sm text-gray-400">Growth analysis over the last 30 days.</p>
              </div>
            </div>
            <div className="flex gap-1">
              {TRADE_RANGE_BTNS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? 'bg-[#3347ff] text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56 relative">
            <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tradeChartGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3347ff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3347ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M ${TRADE_CHART_POINTS.map((p) => `${(p.x / 100) * 400},${(p.y / 100) * 120}`).join(' L ')} L 400,120 L 0,120 Z`}
                fill="url(#tradeChartGrad)"
              />
              <path
                d={`M ${TRADE_CHART_POINTS.map((p) => `${(p.x / 100) * 400},${(p.y / 100) * 120}`).join(' L ')}`}
                fill="none"
                stroke="#3347ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[1, 3, 5].map((i) => (
                <circle key={i} cx={(TRADE_CHART_POINTS[i].x / 100) * 400} cy={(TRADE_CHART_POINTS[i].y / 100) * 120} r="5" fill="#3347ff" />
              ))}
            </svg>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {TRADE_CHART_DATES.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <div className="lg:w-80 shrink-0 space-y-4">
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-[#3347ff]" />
              Trade Extremes
            </h3>
            <div className="space-y-4">
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-[#3347ff]/20 text-[#3347ff] rounded">High</span>
                <ArrowUp className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Max Trade</p>
                <p className="text-xs text-gray-500">Oct 24, 2023</p>
                <p className="text-lg font-bold text-white mt-1">$5,000.00</p>
              </div>
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 text-[10px] text-gray-400 uppercase">Low</span>
                <ArrowDown className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Min Trade</p>
                <p className="text-xs text-gray-500">Nov 02, 2023</p>
                <p className="text-lg font-bold text-white mt-1">$10.00</p>
              </div>
              <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
                <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 rounded">Best</span>
                <Trophy className="w-5 h-5 text-amber-400 mb-2" />
                <p className="text-xs text-gray-400 uppercase">Max Profit</p>
                <p className="text-xs text-gray-500">Single Trade</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">+$4,200.00</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-[#0a1635] border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Pro Tip</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Your win rate has increased by 5% this month. Consider increasing your position size on standard assets to maximize returns.
            </p>
            <button type="button" className="text-sm text-[#3347ff] font-medium flex items-center gap-1 hover:underline">
              View Analysis
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const VALID_TABS: ProfileTab[] = ['profile', 'wallet', 'trade', 'support'];

function parseTab(searchParams: URLSearchParams): ProfileTab {
  const t = (searchParams.get('tab') as ProfileTab) || 'profile';
  return VALID_TABS.includes(t) ? t : 'profile';
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => parseTab(searchParams));

  useEffect(() => {
    setActiveTab(parseTab(searchParams));
  }, [searchParams]);

  const setTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    const q = tab === 'profile' ? '' : `?tab=${tab}`;
    router.replace(`/profile${q}`);
  };

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'profile', label: 'Профиль' },
    { id: 'wallet', label: 'Кошелёк' },
    { id: 'trade', label: 'Торговля' },
    { id: 'support', label: 'Поддержка' },
  ];

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
          <div className="px-6 flex gap-1 border-b border-transparent">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === id
                    ? 'text-white border-[#3347ff]'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 px-6 py-8 overflow-auto">
          {activeTab === 'profile' && <TabProfile />}
          {activeTab === 'wallet' && <TabWallet />}
          {activeTab === 'trade' && <TabTrade />}
          {activeTab === 'support' && <TabSupport />}
        </main>
      </div>
    </AuthGuard>
  );
}
