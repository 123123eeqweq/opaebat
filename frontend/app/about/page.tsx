'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'

export default function AboutPage() {
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('RU')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  const languages = [
    { code: 'UA', label: 'Українська', flag: '/images/flags/ua.svg' },
    { code: 'RU', label: 'Русский', flag: '/images/flags/ru.svg' },
    { code: 'EN', label: 'English', flag: '/images/flags/en.svg' },
  ]

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setIsHeaderScrolled(y > 20)
      setShowScrollTop(y > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - transparent, then bg on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          isHeaderScrolled ? 'bg-[#061230]/95 backdrop-blur-sm' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="ComforTrade" width={40} height={40} className="h-10 w-auto object-contain" />
            <span className="text-xl font-semibold text-white uppercase">ComforTrade</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/start" className="text-gray-300 hover:text-white transition-colors">Как начать?</Link>
            <Link href="/assets" className="text-gray-300 hover:text-white transition-colors">Активы</Link>
            <Link href="/about" className="text-white font-medium">О компании</Link>
            <Link href="/reviews" className="text-gray-300 hover:text-white transition-colors">Отзывы</Link>
            <Link href="/education" className="text-gray-300 hover:text-white transition-colors">Обучение</Link>
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
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl py-2 min-w-[160px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
            <button
              onClick={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
              className="bg-transparent text-white px-6 py-2 rounded-lg font-medium border border-white/50 hover:bg-white/10 transition-colors"
            >
              Войти
            </button>
            <button
              onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
              className="bg-[#3347ff] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors"
            >
              Регистрация
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-4 relative z-10 pt-8 pb-16 md:pt-12 md:pb-24">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label="Хлебные крошки">
            <Link href="/" className="hover:text-white transition-colors">Главная</Link>
            <span className="text-gray-500">→</span>
            <span className="text-white">О компании</span>
          </nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">О компании</h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            COMFORTRADE — надёжный брокер для торговли на Forex и криптовалютах. Высокая доходность до 89%, 40+ инструментов, демо и реальный счёт.
          </p>
        </div>
      </section>

      {/* Mission block */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Наша миссия — сделать финансы доступными каждому
            </h2>
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Мы создаём удобные инструменты для торговли на валютном и криптовалютном рынках. Профессиональная платформа, прозрачные условия и поддержка — чтобы каждый мог уверенно инвестировать и приумножать капитал.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 md:mb-20">
              <Link
                href="/"
                className="inline-flex justify-center px-8 py-4 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors"
              >
                Присоединиться
              </Link>
              <Link
                href="/"
                className="inline-flex justify-center px-8 py-4 rounded-lg bg-white text-[#3347ff] font-medium border border-gray-300 hover:border-[#3347ff] shadow-sm transition-colors"
              >
                Узнать больше
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/aboutmain.png"
              alt="Торговля и финансы"
              width={1200}
              height={700}
              className="w-full max-w-7xl h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* Accomplishments / Stats */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight max-w-xl">
              Посмотрите, чего мы
              <br />
              достигли
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-md lg:pt-1">
              Мы постоянно развиваем платформу и растем вместе с клиентами. Ниже — ключевые показатели нашей работы.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                100K<span className="text-[#3347ff]">+</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">Активных трейдеров</p>
              <p className="text-sm text-gray-600">
                Торгуют на нашей платформе по всему миру.
              </p>
            </div>
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                40<span className="text-[#3347ff]">+</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">Торговых инструментов</p>
              <p className="text-sm text-gray-600">
                Forex пары и криптовалюты для Call/Put сделок.
              </p>
            </div>
            <div className="bg-white rounded-2xl testimonial-card-shadow p-8 flex flex-col items-center text-center">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                89<span className="text-[#3347ff]">%</span>
              </p>
              <p className="text-[#3347ff] font-semibold mb-3">Доходность до</p>
              <p className="text-sm text-gray-600">
                Честная фиксированная выплата по успешным сделкам.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story and Mission Block */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/images/office.jpeg"
                  alt="Офис компании"
                  width={800}
                  height={600}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>

            {/* Right Column - Text Content */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                История и миссия нашей компании
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                ComforTrade создан для того, чтобы торговля на Forex и криптовалютах была доступной, прозрачной и удобной. Мы развиваем современный терминал с Call/Put сделками, демо и реальным счётом, профессиональными графиками и поддержкой 24/7. Наша цель — дать каждому трейдеру надёжный инструмент для приумножения капитала.
              </p>
              <Link href="/start" className="inline-block bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors shadow-lg">
                Как начать
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values Block */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left Column - Text Content */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Ценности, которыми мы руководствуемся
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Честность, прозрачность и забота о клиентах — основа нашей работы. Мы строим долгосрочные отношения с трейдерами.
              </p>
              <Link href="/reviews" className="inline-block bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors shadow-lg">
                Читать отзывы
              </Link>
            </div>

            {/* Right Column - Cards Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1 - Прозрачность */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Image
                    src="/images/1.svg"
                    alt="Прозрачность"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Прозрачность</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Честные условия Call/Put, фиксированная доходность до 89%. Без скрытых комиссий.
                </p>
              </div>

              {/* Card 2 - Надёжность */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Image
                    src="/images/2.svg"
                    alt="Надёжность"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Надёжность</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Защита данных, AML/KYC, быстрый вывод средств. Ваши средства под контролем.
                </p>
              </div>

              {/* Card 3 - Удобство */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Image
                    src="/images/3.svg"
                    alt="Удобство"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Удобство</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Интуитивный терминал, графики, индикаторы. Торгуйте с комфортом в любой момент.
                </p>
              </div>

              {/* Card 4 - Поддержка */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Image
                    src="/images/4.svg"
                    alt="Поддержка"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Поддержка</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Отзывчивая команда, обучающие материалы. Помогаем на всех этапах торговли.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration slide-out panel */}
      <>
        <div
          className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showRegisterPanel ? 'bg-transparent' : 'bg-transparent pointer-events-none'}`}
          onClick={() => setShowRegisterPanel(false)}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#061230] shadow-2xl z-[101] flex flex-col transition-transform duration-300 ease-out ${showRegisterPanel ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-hidden={!showRegisterPanel}
        >
            <h2 id="panel-title" className="sr-only">{panelMode === 'login' ? 'Войти' : 'Регистрация'}</h2>
            <div className="relative pt-6 px-6 pb-0 border-b border-white/10">
              <button
                onClick={() => setShowRegisterPanel(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors z-10"
                aria-label="Закрыть"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex w-full">
                <button
                  type="button"
                  onClick={() => setPanelMode('register')}
                  className={`flex-1 pb-4 text-center text-lg font-medium transition-colors relative ${
                    panelMode === 'register' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Регистрация
                  {panelMode === 'register' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('login')}
                  className={`flex-1 pb-4 text-center text-lg font-medium transition-colors relative ${
                    panelMode === 'login' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Вход
                  {panelMode === 'login' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white text-gray-800 font-medium hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Продолжить с Google
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#061230] text-gray-400">или</span>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    id="panel-email"
                    type="email"
                    placeholder=" "
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                  />
                  <label
                    htmlFor="panel-email"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                  >
                    Email
                  </label>
                </div>
                <div className="relative group">
                  <input
                    id="panel-password"
                    type="password"
                    placeholder=" "
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                  />
                  <label
                    htmlFor="panel-password"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                  >
                    Пароль
                  </label>
                </div>
                {panelMode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button type="button" className="text-sm text-[#3347ff] hover:text-[#2a3ae6] transition-colors">
                      Забыли пароль?
                    </button>
                  </div>
                )}
                {panelMode === 'register' && (
                  <div className="relative group">
                    <input
                      id="panel-promo"
                      type="text"
                      placeholder=" "
                      className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all"
                    />
                    <label
                      htmlFor="panel-promo"
                      className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                        top-1/2 -translate-y-1/2
                        peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                        peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                    >
                      Промокод <span className="text-gray-500/80">(опционально)</span>
                    </label>
                  </div>
                )}
                {panelMode === 'register' && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-[#3347ff] focus:ring-[#3347ff]/50"
                    />
                    <span className="text-sm text-gray-400">
                      Согласен с <Link href="/policy/terms" className="text-[#3347ff] hover:underline">условиями использования</Link> и <Link href="/policy/privacy" className="text-[#3347ff] hover:underline">политикой конфиденциальности</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={panelMode === 'register' && !agreeToTerms}
                >
                  {panelMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                </button>
              </form>
            </div>
            {panelMode === 'register' && (
              <div className="p-6 border-t border-white/10 bg-[#061230]">
                <p className="text-xs text-center text-gray-500 leading-relaxed">
                  Мы гарантируем защиту ваших данных. Перед началом работы ознакомьтесь с <Link href="/policy/terms" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">Политикой использования</Link> и <Link href="/policy/aml-kyc" className="text-gray-400 hover:text-[#3347ff] transition-colors underline decoration-gray-600/30 underline-offset-2">правилами AML/KYC</Link>.
                </p>
              </div>
            )}
          </div>
      </>

      {/* Social Media Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Мы в социальных сетях
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Следите за нашими новостями, обновлениями и полезными материалами в социальных сетях
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {/* Facebook */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#1877F2] hover:bg-[#1877F2] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Twitter/X */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-black hover:bg-black transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="Twitter"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#E4405F] hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#0077B5] hover:bg-[#0077B5] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="LinkedIn"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#0088cc] hover:bg-[#0088cc] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="Telegram"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="#"
                className="group flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-gray-200 hover:border-[#FF0000] hover:bg-[#FF0000] transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                aria-label="YouTube"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

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
