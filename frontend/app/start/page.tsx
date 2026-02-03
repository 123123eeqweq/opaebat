'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { UserPlus, Wallet, TrendingUp } from 'lucide-react'
import Footer from '@/components/Footer'
import { SiteHeader } from '@/components/SiteHeader'

export default function StartPage() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader
        activeNav="start"
        onOpenLogin={() => { setPanelMode('login'); setShowRegisterPanel(true); }}
        onOpenRegister={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
      />

      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-4 relative z-10 pt-8 pb-16 md:pt-12 md:pb-24">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label="Хлебные крошки">
            <Link href="/" className="hover:text-white transition-colors">Главная</Link>
            <span className="text-gray-500">→</span>
            <span className="text-white">Как начать</span>
          </nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Как начать</h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Регистрация, верификация, первый депозит и первые сделки — коротко о том, как начать торговать с COMFORTRADE.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Column - Phone Image */}
            <div className="flex items-center justify-center md:justify-start">
              <div className="relative w-full max-w-sm">
                <Image
                  src="/images/third.png"
                  alt="Торговый терминал ComforTrade"
                  width={400}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>

            {/* Right Column - Steps */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  Начните с ComforTrade
                </h2>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                  за 3 простых шага
                </h3>
              </div>

              {/* Step 1 */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <UserPlus className="w-8 h-8 text-[#3347ff]" strokeWidth={2} aria-hidden />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">1. Зарегистрируйтесь</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Email, пароль — и готово. Демо-счёт даём сразу, без пополнения. Потренируйтесь, пока не почувствуете себя уверенно.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Wallet className="w-8 h-8 text-[#3347ff]" strokeWidth={2} aria-hidden />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">2. Пополните счёт</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Карта, электронные кошельки, крипта — как удобнее. Минимум небольшой, можно начать с малого.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-[#3347ff]" strokeWidth={2} aria-hidden />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">3. Начните торговать</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Выберите актив, поставьте на рост или падение — и ждите результат. Работает в браузере, даже с телефона.
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }} className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors text-center">
                  Создать аккаунт
                </button>
                <Link href="/terminal" className="bg-white text-[#3347ff] px-8 py-4 rounded-lg font-medium border border-[#3347ff] hover:bg-[#3347ff]/5 transition-colors text-center flex items-center justify-center">
                  Открыть Демо
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Подробная инструкция */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-12 md:mb-16">
            Что нужно для старта
          </h2>
          
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Карточка 1 */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-[#3347ff]">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Регистрация</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Нажмите «Создать аккаунт» на главной странице. Введите email и придумайте пароль. Подтвердите согласие с условиями — и аккаунт готов.
                </p>
              </div>

              {/* Карточка 2 */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-[#3347ff]">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Демо или реальный счёт</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Демо-счёт — бесплатно и без риска. Попробуйте платформу с виртуальным балансом. Для реальной торговли пополните счёт удобным способом.
                </p>
              </div>

              {/* Карточка 3 */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-[#3347ff]">3</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Выбор актива</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Выберите валютную пару (EUR/USD, GBP/USD) или криптовалюту (BTC, ETH). Изучите график и определите направление движения цены.
                </p>
              </div>

              {/* Карточка 4 */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-[#3347ff]/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-[#3347ff]">4</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Первая сделка</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Укажите сумму сделки и время экспирации. Выберите Call (рост) или Put (падение). Откройте сделку — результат известен сразу после истечения времени.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <Link href="/terminal" className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors inline-block">
                Начать торговать
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Обучение для новичков и лучшие стратегии от экспертов
            </h2>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Мы подготовили комплексную программу обучения для начинающих трейдеров, а также собрали проверенные стратегии от опытных специалистов
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Card 1 - For Beginners */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <svg className="w-8 h-8 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Обучение для новичков
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Пошаговые уроки, которые помогут освоить основы торговли. От базовых понятий до первых успешных сделок.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Основы торговли и платформы</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Технический анализ и графики</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Управление рисками и капиталом</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Практические примеры и кейсы</span>
                </li>
              </ul>
              <Link href="/education" className="inline-flex items-center gap-2 text-[#3347ff] font-semibold hover:text-[#2a3ae6] transition-colors">
                Начать обучение
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Card 2 - Expert Strategies */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <svg className="w-8 h-8 text-[#3347ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Стратегии от экспертов
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Проверенные торговые стратегии от опытных трейдеров и аналитиков. Узнайте, как профессионалы достигают стабильной прибыли.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Стратегии Call/Put и таймфреймы</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Скальпинг и внутридневная торговля</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Анализ рынка от профессионалов</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#3347ff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Реальные примеры успешных сделок</span>
                </li>
              </ul>
              <Link href="/education" className="inline-flex items-center gap-2 text-[#3347ff] font-semibold hover:text-[#2a3ae6] transition-colors">
                Изучить стратегии
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Видео-секция */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#3347ff]/5 via-[#3347ff]/10 to-[#3347ff]/5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z" fill="url(#waveGradientStart)" />
            <defs>
              <linearGradient id="waveGradientStart" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3347ff" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#4a5aff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3347ff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-12 md:mb-16">
            Посмотрите, как легко торговать с ComforTrade
          </h2>

          <div className="flex justify-center items-center">
            <div className="relative w-full max-w-3xl aspect-video bg-[#061230] rounded-2xl overflow-hidden flex items-center justify-center">
              <button className="w-20 h-20 md:w-24 md:h-24 bg-[#3347ff] rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-[#2a3ae6] transition-all hover:scale-110" aria-label="Смотреть видео">
                <svg className="w-10 h-10 md:w-12 md:h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
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
