'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactCountryFlag from 'react-country-flag'
// ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ТЕСТА
import { useAuth } from '@/lib/hooks/useAuth'
import Footer from '@/components/Footer'
import { INSTRUMENTS } from '@/lib/instruments'
import { LANGUAGES } from '@/lib/languages'

function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  const parts = pair.split('/')
  if (parts.length !== 2) return [null, null]
  const [base, quote] = parts
  const currencyToCountry: Record<string, string> = {
    EUR: 'EU', USD: 'US', GBP: 'GB', JPY: 'JP', AUD: 'AU', CAD: 'CA', CHF: 'CH', NZD: 'NZ', NOK: 'NO', UAH: 'UA', BTC: 'US', ETH: 'US', SOL: 'US', BNB: 'US',
  }
  return [currencyToCountry[base] || null, currencyToCountry[quote] || null]
}

const NON_OTC_INSTRUMENTS = INSTRUMENTS.filter((i) => !i.label.includes('OTC'))

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuth()
  
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('RU')
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')

  const languages = LANGUAGES

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setShowScrollTop(y > 400)
      setIsHeaderScrolled(y > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Redirect to terminal if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/terminal')
    }
  }, [isAuthenticated, isLoading, router])

  // Открыть модалку логина при ?auth=login (редирект с терминала)
  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setPanelMode('login')
      setShowRegisterPanel(true)
      router.replace('/')
    }
  }, [searchParams, router])

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    if (panelMode === 'register') {
      if (password !== confirmPassword) {
        setError('Пароли не совпадают')
        setIsSubmitting(false)
        return
      }
      if (password.length < 6) {
        setError('Пароль должен быть не менее 6 символов')
        setIsSubmitting(false)
        return
      }
      if (!agreeToTerms) {
        setError('Необходимо согласиться с условиями использования')
        setIsSubmitting(false)
        return
      }

      const result = await register(email, password)
      if (result.success) {
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else {
        setError(result.error || 'Ошибка регистрации')
        setIsSubmitting(false)
        // Если email уже занят — переключаем на вкладку входа
        if (result.error?.includes('уже зарегистрирован')) setPanelMode('login')
      }
    } else {
      const result = await login(email, password)
      if (result.success) {
        setShowRegisterPanel(false)
        router.push('/terminal')
      } else {
        setError(result.error || 'Ошибка входа')
        setIsSubmitting(false)
      }
    }
  }

  const handleLogout = async () => {
    await logout()
    setShowRegisterPanel(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header and Hero Section with shared background */}
      <div className="bg-[#061230] relative overflow-hidden pt-24">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back1.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/back2.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>
        
        {/* Header */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
            isHeaderScrolled ? 'bg-[#061230]/95 backdrop-blur-sm' : 'bg-transparent'
          }`}
        >
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="ComforTrade" width={40} height={40} className="h-10 w-auto object-contain" />
            <span className="text-xl font-semibold text-white uppercase">ComforTrade</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/start" className="text-gray-300 hover:text-white">Как начать?</Link>
            <Link href="/assets" className="text-gray-300 hover:text-white">Активы</Link>
            <Link href="/about" className="text-gray-300 hover:text-white">О компании</Link>
            <Link href="/reviews" className="text-gray-300 hover:text-white">Отзывы</Link>
            <Link href="/education" className="text-gray-300 hover:text-white">Обучение</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="text-white hover:text-gray-300 transition-colors flex items-center gap-2 px-2 py-1"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden relative">
                  <Image 
                    src={languages.find(l => l.code === currentLanguage)?.flag || '/images/flags/ru.svg'} 
                    alt={currentLanguage}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="uppercase font-medium">{currentLanguage}</span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl py-2 min-w-[200px] max-h-[70vh] overflow-y-auto scrollbar-dropdown-light z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col p-1">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setCurrentLanguage(lang.code)
                            setShowLanguageMenu(false)
                          }}
                          className={`text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                            currentLanguage === lang.code
                              ? 'bg-[#3347ff]/10 text-[#3347ff]'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden relative flex-shrink-0">
                            <Image 
                              src={lang.flag} 
                              alt={lang.code}
                              fill
                              className="object-cover"
                            />
                          </div>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <>
                    <span className="text-white text-sm">{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="bg-transparent text-white px-6 py-2 rounded-lg font-medium border border-white/50 hover:bg-white/10 transition-colors"
                    >
                      Выйти
                    </button>
                    <Link
                      href="/terminal"
                      className="bg-[#3347ff] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors"
                    >
                      Терминал
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
                      className="bg-transparent text-white px-6 py-2 rounded-lg font-semibold border border-white/50 hover:bg-white/10 transition-colors"
                    >
                      Войти
                    </button>
                    <button
                      onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
                      className="bg-[#3347ff] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#2a3ae6] transition-colors"
                    >
                      Регистрация
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-24 md:py-32 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="space-y-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Твоя прибыль на валютном рынке начинается с{' '}
                  <span className="relative inline-block">
                    COMFORTRADE
                    <Image
                      src="/images/star.png"
                      alt=""
                      width={24}
                      height={24}
                      className="absolute -top-2 -right-4 md:-top-3 md:-right-5 w-4 h-4 md:w-6 md:h-6 object-contain drop-shadow-lg"
                    />
                  </span>
                </h1>
                
                <p className="text-lg text-gray-300 leading-relaxed max-w-lg">
                  Надежный брокер с высокой доходностью и широким выбором инструментов торговли
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setShowRegisterPanel(true)} className="text-white px-8 py-4 rounded-lg font-semibold transition-colors hover:opacity-95" style={{ background: 'linear-gradient(135deg, #4a5aff 0%, #3347ff 50%, #2a3ae6 100%)' }}>
                    Создать аккаунт
                  </button>
                  <button className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold border border-white/50 hover:bg-white/10 transition-colors">
                    Начать в 1 клик
                  </button>
                </div>
              </div>

              {/* Right Column - Phone Image */}
              <div className="flex items-center justify-center md:justify-end">
                <Image
                  src="/images/hero.png"
                  alt="Торговая платформа ComforTrade"
                  width={600}
                  height={1000}
                  className="w-full h-auto max-w-[500px] md:max-w-[560px] lg:max-w-[600px]"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Logos Section - Бегущая строка */}
        <section className="w-full py-12 px-4 border-t border-gray-700 relative z-10 overflow-hidden">
          <div className="relative w-full">
            <div className="flex animate-marquee gap-8 md:gap-12 whitespace-nowrap w-max" style={{ width: 'max-content' }}>
              {[...NON_OTC_INSTRUMENTS, ...NON_OTC_INSTRUMENTS, ...NON_OTC_INSTRUMENTS].map((inst, idx) => {
                const pair = inst.label.replace(' Real', '')
                const [country1, country2] = getCurrencyCountryCodes(pair)
                return (
                  <div key={`${inst.id}-${idx}`} className="flex items-center gap-2 shrink-0">
                    {country1 && (
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center">
                        <ReactCountryFlag
                          countryCode={country1}
                          svg
                          style={{ width: '24px', height: '24px', objectFit: 'cover', display: 'block' }}
                          title={country1}
                        />
                      </div>
                    )}
                    {country2 && (
                      <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/70 flex-shrink-0 flex items-center justify-center -ml-2.5 relative z-10">
                        <ReactCountryFlag
                          countryCode={country2}
                          svg
                          style={{ width: '24px', height: '24px', objectFit: 'cover', display: 'block' }}
                          title={country2}
                        />
                      </div>
                    )}
                    <span className="text-gray-300 text-lg font-medium">{pair}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          {/* Page Indicator */}
          <div className="text-center mb-4">
            <span className="text-[#3347ff] text-base">01 — 08</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-12 md:mb-16">
            Всё для торговли на Forex и криптовалютах
          </h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Feature 1 with Phone Image inside */}
            <div className="md:col-span-2 bg-white rounded-3xl feature-card-shadow flex gap-0 items-stretch overflow-hidden min-h-[320px]">
              {/* Feature 1 Content */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                  <Image src="/images/1.svg" alt="Торговые инструменты" width={64} height={64} className="rounded-lg" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">40+ валютных пар и криптовалют</h3>
                <p className="text-base font-medium text-[#7c7f9c]">
                  Forex (EUR/USD, GBP/USD, USD/JPY и др.), крипто (BTC, ETH, SOL) — торгуйте тем, что вам удобно.
                </p>
              </div>

              {/* Phone Image - Cropped at half height */}
              <div className="relative flex-1 flex items-end justify-center p-4">
                <div className="relative w-full max-w-[220px] h-[220px] overflow-hidden">
                  <Image
                    src="/images/second.png"
                    alt="Интерфейс терминала"
                    width={300}
                    height={600}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/2.svg" alt="Счета" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Демо и реальный счёт</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Начните с демо-счёта без риска или сразу торгуйте на реальном — выбор за вами.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/3.svg" alt="Исполнение" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Быстрое исполнение сделок</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Мгновенное открытие и закрытие позиций, прозрачные условия и честная доходность до 89%.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/4.svg" alt="Рынок" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Торговля в реальном времени</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Актуальные котировки, свечные и линейные графики, таймфреймы от 5 секунд до 1 дня.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/5.svg" alt="Графики" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Профессиональные графики и индикаторы</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Свечи, линии, индикаторы, рисунки — всё для удобного технического анализа.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setShowRegisterPanel(true)} className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors">
              Регистрация
            </button>
            <button className="bg-white text-[#3347ff] px-8 py-4 rounded-lg font-medium border border-gray-300 hover:border-[#3347ff] transition-colors">
              Узнать подробнее
            </button>
          </div>
        </div>
      </section>

      {/* Third Block - Crypto Wallet from the Future */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8">
              {/* Page Indicator */}
              <div>
                <span className="text-[#3347ff] text-base">02 — 08</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Торговая платформа нового поколения
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Удобный терминал с интуитивным интерфейсом: выбирайте актив, ставку и время — торгуйте без лишних действий.
              </p>

              {/* Features List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Высокая доходность до 89%</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Прозрачные условия Call/Put</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Защита данных и средств</span>
                </div>
              </div>
            </div>

            {/* Right Column - Phone Image */}
            <div className="relative flex items-center justify-center">
              <Image
                src="/images/third.png"
                alt="Интерфейс торгового терминала"
                width={400}
                height={800}
                className="w-full h-auto max-w-md rounded-2xl shadow-md"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Email signup Block */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-[#061230] relative overflow-hidden rounded-2xl py-16 md:py-24 -mx-4 md:-mx-8 px-4 md:px-6 lg:px-8 flex justify-center">
            <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Будьте в курсе обновлений
                </h2>
                <p className="text-gray-400 text-base md:text-lg">
                  Подпишитесь на рассылку — новости брокера, акции и полезные материалы по торговле на Forex и крипте.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-1 md:flex-initial md:min-w-[320px]">
                <input
                  type="email"
                  placeholder="Введите ваш email"
                  className="flex-1 min-w-0 px-5 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-colors"
                />
                <button
                  type="button"
                  className="shrink-0 px-8 py-4 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors"
                >
                  Подписаться
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fourth Block - Bulletproof Security */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Phone Image */}
            <div className="relative flex items-center justify-center order-2 md:order-1">
              <Image
                src="/images/fourth.png"
                alt="Безопасность платформы"
                width={400}
                height={800}
                className="w-full h-auto max-w-md rounded-2xl shadow-md"
                priority
              />
            </div>

            {/* Right Column - Text Content */}
            <div className="space-y-8 order-1 md:order-2">
              {/* Page Indicator */}
              <div>
                <span className="text-[#3347ff] text-base">03 — 08</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Надёжная защита ваших данных и средств
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Безопасность в приоритете: защищённые счета, шифрование данных и соответствие стандартам AML/KYC.
              </p>

              {/* Security Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Security Incidents */}
                <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">0.</div>
                  <div className="text-sm text-gray-600">Инцидентов безопасности</div>
                </div>

                {/* AES Encryption */}
                <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    256 <span className="text-[#3347ff]">бит</span>
                  </div>
                  <div className="text-sm text-gray-600">Шифрование AES</div>
                </div>

                {/* Encrypted Data */}
                <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">100%</div>
                  <div className="text-sm text-gray-600">Данных зашифровано</div>
                </div>

                {/* Security Certification */}
                <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-center text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">CISA+</div>
                  <div className="text-sm text-gray-600">Сертификат безопасности</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Block */}
      <section className="py-16 md:py-24 bg-[#F8F8FA]">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Что говорят о ComforTrade
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowRegisterPanel(true)} className="bg-[#3347ff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors">
                Регистрация
              </button>
              <button className="bg-white text-[#3347ff] px-6 py-3 rounded-lg font-medium border border-gray-300 hover:border-[#3347ff] transition-colors">
                Все отзывы
              </button>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Review Card 1 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                «Торговать ещё никогда не было так просто»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                Удобный терминал, быстрая регистрация и отзывчивая поддержка. Рекомендую всем, кто только начинает на Forex.
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/11.jpg"
                    alt="Джон Картер"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Джон Картер</div>
                    <div className="text-sm text-gray-500">@johncater</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(4)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 2 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                «Лучшая торговая платформа, точка»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                Пользовался разными брокерами — здесь самый продуманный интерфейс и стабильная работа. Ни разу не было сбоев или задержек с исполнением.
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/22.jpg"
                    alt="Майкл Скотт"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Майкл Скотт</div>
                    <div className="text-sm text-gray-500">@michscott</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 3 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                «Отличный опыт торговли»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                Графики, индикаторы, быстрые сделки Call/Put — всё на месте. Для активной торговли это именно то, что нужно. Плюс высокая доходность.
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/33.jpg"
                    alt="Софи Мур"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Софи Мур</div>
                    <div className="text-sm text-gray-500">@soph_moore</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Card 4 */}
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                «Будущее онлайн-трейдинга»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                ComforTrade — это то, как должен выглядеть современный брокер: быстро, понятно и безопасно. Очень доволен выбором.
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src="/images/44.jpg"
                    alt="Мэтт Кэннон"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Мэтт Кэннон</div>
                    <div className="text-sm text-gray-500">@matt_cannon</div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Resources Block */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-12">
            <div className="mb-4">
              <span className="text-[#3347ff] text-base">07 — 08</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                Последние материалы
              </h2>
              <p className="text-lg text-gray-600 max-w-md">
                Статьи, руководства и новости о Forex, крипте и торговле. Будьте в курсе трендов и обновлений платформы.
              </p>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/111.jpeg"
                  alt="Торговля на Forex"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Приложения</span>
                  <span>•</span>
                  <span>9 ноя 2021</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Как начать торговать на Forex: пошаговое руководство
                </h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">
                  Читать далее
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/222.jpeg"
                  alt="Торговля криптовалютами"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Продукты</span>
                  <span>•</span>
                  <span>9 ноя 2021</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Торговля криптовалютами: BTC, ETH и другие активы
                </h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">
                  Читать далее
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/images/333.jpeg"
                  alt="Торговые инструменты"
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                  <span>Приложения</span>
                  <span>•</span>
                  <span>9 ноя 2021</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  5 советов для успешной торговли на бинарных опционах
                </h3>
                <a href="#" className="text-[#3347ff] font-medium flex items-center gap-2 hover:gap-3 transition-all">
                  Читать далее
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* End Block - Download CTA */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            {/* Page Indicator */}
            <div className="mb-4">
              <span className="text-[#3347ff] text-base">08 — 08</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
              Начните торговать уже сегодня
            </h2>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button onClick={() => setShowRegisterPanel(true)} className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                Создать аккаунт
              </button>
              <Link href="/terminal" className="bg-white text-[#3347ff] px-8 py-4 rounded-lg font-medium border border-gray-300 hover:border-[#3347ff] transition-colors flex items-center justify-center gap-3">
                Перейти в терминал
              </Link>
            </div>
          </div>

          {/* Large Image - Cropped at half height */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl" style={{ maxHeight: '400px', overflow: 'hidden' }}>
              <Image
                src="/images/end.png"
                alt="Торговый терминал ComforTrade"
                width={600}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA Block */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Left Section - Logo and Text */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <Image src="/images/logo.png" alt="ComforTrade" width={48} height={48} className="h-12 w-auto object-contain" />
                <span className="text-2xl font-bold text-gray-900 uppercase">ComforTrade</span>
              </div>
              <p className="text-gray-600 max-w-md">
                Брокер для торговли на Forex и криптовалютах. Демо и реальный счёт, честная доходность, удобный терминал.
              </p>
            </div>

            {/* Right Section - CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowRegisterPanel(true)} className="bg-[#3347ff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                Регистрация
              </button>
              <Link href="/terminal" className="bg-white text-[#3347ff] px-6 py-3 rounded-lg font-medium border border-gray-300 hover:border-[#3347ff] transition-colors flex items-center justify-center gap-3">
                Терминал
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Registration slide-out panel */}
      <>
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showRegisterPanel ? 'bg-transparent' : 'bg-transparent pointer-events-none'}`}
          onClick={() => {
            setShowRegisterPanel(false);
            setError('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setPromoCode('');
            setAgreeToTerms(false);
            setShowForgotPassword(false);
            setForgotPasswordEmail('');
          }}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#0a1835] backdrop-blur-xl shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out border-l border-white/5 ${showRegisterPanel ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-hidden={!showRegisterPanel}
        >
            <h2 id="panel-title" className="sr-only">{showForgotPassword ? 'Восстановление пароля' : panelMode === 'login' ? 'Войти' : 'Регистрация'}</h2>
            {!showForgotPassword && (
            <div className="relative pt-8 px-6 pb-4">
              <div className="flex w-full gap-2 p-1 rounded-xl bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('register');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                    setShowForgotPassword(false);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    panelMode === 'register' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Регистрация
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('login');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                    setShowForgotPassword(false);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    panelMode === 'login' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Вход
                </button>
              </div>
            </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 pb-12">
              {showForgotPassword ? (
                <div className="space-y-5 pt-8">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 -ml-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Назад к входу
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Восстановление пароля</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Введите email, и мы отправим вам ссылку для сброса пароля.
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="forgot-email" className="block text-xs font-medium text-gray-400 ml-1">Email</label>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="Введите Email"
                        className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!forgotPasswordEmail) {
                          setError('Введите email');
                          return;
                        }
                        setError('');
                        // TODO: вызвать API восстановления пароля
                        alert('Ссылка для восстановления пароля будет отправлена на указанный email. (Функция в разработке)');
                      }}
                      className="w-full mt-4 py-3.5 rounded-xl bg-[#3347ff] text-white font-semibold hover:bg-[#2a3ae6] active:scale-[0.99] transition-all shadow-lg shadow-[#3347ff]/20"
                    >
                      Восстановить пароль
                    </button>
                  </div>
                </div>
              ) : (
              <form className="space-y-5" onSubmit={handleFormSubmit}>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white font-medium hover:bg-white/12 transition-colors"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Продолжить с Google
                </button>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-[#0a1835] text-xs text-gray-500">или</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="panel-email" className="block text-xs font-medium text-gray-400 ml-1">Email</label>
                  <input
                    id="panel-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Введите Email"
                    required
                    disabled={isSubmitting}
                    className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="panel-password" className="block text-xs font-medium text-gray-400 ml-1">Пароль</label>
                  <input
                    id="panel-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                  />
                </div>
                {panelMode === 'register' && (
                  <div className="space-y-2">
                    <label htmlFor="panel-confirm-password" className="block text-xs font-medium text-gray-400 ml-1">Подтвердите пароль</label>
                    <input
                      id="panel-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Подтвердите пароль"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                    />
                  </div>
                )}
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-gray-400 hover:text-[#3347ff] transition-colors font-medium underline underline-offset-2 decoration-gray-600/30"
                    >
                      Забыли пароль?
                    </button>
                  </div>
                )}
                {panelMode === 'register' && (
                  <div className="space-y-2">
                    <label htmlFor="panel-promo" className="block text-xs font-medium text-gray-400 ml-1">Промокод <span className="text-gray-600">(опционально)</span></label>
                    <input
                      id="panel-promo"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Введите промокод"
                      disabled={isSubmitting}
                      className="panel-auth-input w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:shadow-none focus:border-white/10 focus:bg-white/[0.08] transition-all disabled:opacity-50"
                    />
                  </div>
                )}
                {panelMode === 'register' && (
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-1 w-4 h-4 rounded border-white/30 bg-white/5 text-[#3347ff] focus:ring-[#3347ff]/50 focus:ring-offset-0 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                      Согласен с <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">условиями использования</Link> и <Link href="/policy/privacy" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">политикой конфиденциальности</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={(panelMode === 'register' && !agreeToTerms) || isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#3347ff] text-white font-semibold hover:bg-[#2a3ae6] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3347ff]/20"
                >
                  {isSubmitting 
                    ? (panelMode === 'login' ? 'Вход...' : 'Регистрация...') 
                    : (panelMode === 'login' ? 'Войти' : 'Зарегистрироваться')
                  }
                </button>
              </form>
              )}
            </div>
            {panelMode === 'register' ? (
              <div className="p-6 border-t border-white/10 bg-[#0a1835]/80">
                <p className="text-xs text-center text-gray-500 leading-relaxed font-medium">
                  Мы гарантируем защиту ваших данных. Перед началом работы ознакомьтесь с <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">Политикой использования</Link> и <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">правилами AML/KYC</Link>.
                </p>
              </div>
            ) : (
              <div className="p-6 border-t border-white/10 bg-[#0a1835]/80">
                <div>
                  <p className="text-xs text-center text-gray-500 mb-3 font-medium">Подпишитесь на наши соц сети</p>
                  <div className="flex justify-center gap-4">
                    <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Telegram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="YouTube">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
      </>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        aria-label="Наверх"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-lg bg-[#3347ff] text-white shadow-lg hover:bg-[#2a3ae6] flex items-center justify-center transition-all duration-300 ease-out ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-105'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  )
}
