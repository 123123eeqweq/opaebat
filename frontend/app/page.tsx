'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Footer from '@/components/Footer'

export default function Home() {
  const router = useRouter()
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

  const languages = [
    { code: 'UA', label: 'Українська', flag: '/images/flags/ua.svg' },
    { code: 'RU', label: 'Русский', flag: '/images/flags/ru.svg' },
    { code: 'EN', label: 'English', flag: '/images/flags/en.svg' },
  ]

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
                  </>
                )}
              </>
            )}
          </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 md:py-16 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text Content */}
              <div className="space-y-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Твоя прибыль на валютном рынке начинается с COMFORTRADE
                </h1>
                
                <p className="text-lg text-gray-300 leading-relaxed max-w-lg">
                  Надежный брокер с высокой доходностью и широким выбором инструментов торговли
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setShowRegisterPanel(true)} className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors">
                    Создать аккаунт
                  </button>
                  <button className="bg-transparent text-white px-8 py-4 rounded-lg font-medium border border-white/50 hover:bg-white/10 transition-colors">
                    Начать в 1 клик
                  </button>
                </div>
              </div>

              {/* Right Column - Phone Image */}
              <div className="flex items-center justify-center md:justify-end">
                <Image
                  src="/images/hero.png"
                  alt="Крипто-приложение на телефоне"
                  width={300}
                  height={500}
                  className="w-full h-auto max-w-[300px]"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Logos Section */}
        <section className="container mx-auto px-4 py-12 border-t border-gray-700 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
            <span className="text-gray-300 text-lg font-medium">EUR/USD</span>
            <span className="text-gray-300 text-lg font-medium">AUD/CAD</span>
            <span className="text-gray-300 text-lg font-medium">GBP/USD</span>
            <span className="text-gray-300 text-lg font-medium">USD/JPY</span>
            <span className="text-gray-300 text-lg font-medium">USD/CHF</span>
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
            Всё необходимое для покупки, торговли и инвестиций в криптовалюту
          </h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Feature 1 with Phone Image inside */}
            <div className="md:col-span-2 bg-white rounded-3xl feature-card-shadow flex gap-0 items-stretch overflow-hidden min-h-[320px]">
              {/* Feature 1 Content */}
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                  <Image src="/images/1.svg" alt="Покупка криптовалюты" width={64} height={64} className="rounded-lg" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Покупка 100+ криптоактивов</h3>
                <p className="text-base font-medium text-[#7c7f9c]">
                  Широкий выбор монет и токенов для торговли и инвестиций в одном приложении.
                </p>
              </div>

              {/* Phone Image - Cropped at half height */}
              <div className="relative flex-1 flex items-end justify-center p-4">
                <div className="relative w-full max-w-[220px] h-[220px] overflow-hidden">
                  <Image
                    src="/images/second.png"
                    alt="Скриншот крипто-приложения"
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
                <Image src="/images/2.svg" alt="Защищённый кошелёк" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Защищённый и зашифрованный кошелёк</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Ваши средства под надёжной защитой с современным шифрованием.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/3.svg" alt="Отправка и получение" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Отправляйте и получайте легко</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Быстрые переводы по всему миру с минимальными комиссиями.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/4.svg" alt="Инвестиции" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Инвестируйте в реальном времени</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Мгновенное исполнение сделок и актуальные рыночные данные.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-3xl feature-card-shadow p-6 flex flex-col justify-center min-h-[320px]">
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                <Image src="/images/5.svg" alt="Графики" width={64} height={64} className="rounded-lg" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Следите и анализируйте графики</h3>
              <p className="text-base font-medium text-[#7c7f9c]">
                Профессиональные инструменты для технического анализа.
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
                Криптокошелёк из будущего
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Современный кошелёк с продуманным интерфейсом, низкими комиссиями и максимальной защитой ваших активов.
              </p>

              {/* Features List */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Самые низкие комиссии на рынке</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Быстрые и безопасные переводы</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#3347ff] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-gray-900">256-битное шифрование</span>
                </div>
              </div>
            </div>

            {/* Right Column - Phone Image */}
            <div className="relative flex items-center justify-center">
              <Image
                src="/images/third.png"
                alt="Интерфейс криптокошелька"
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
                  Подпишитесь на рассылку — новости, акции и полезные материалы о торговле и инвестициях.
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
                alt="Интерфейс проверки безопасности"
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
                Пуленепробиваемая безопасность по замыслу
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Безопасность заложена в основу архитектуры: многоуровневая защита и соответствие международным стандартам.
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
                «Покупать крипту ещё никогда не было так просто»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                Удобное приложение, быстрая верификация и приятная поддержка. Рекомендую всем, кто только начинает разбираться в криптовалюте.
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
                «Лучший криптокошелёк, точка»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                Пользовался разными сервисами — здесь самый продуманный интерфейс и стабильная работа. Ни разу не было сбоев или задержек с выводом.
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
                Графики, уведомления, быстрые ордера — всё на месте. Для активной торговли это именно то, что нужно. Плюс низкие комиссии.
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
                «Будущее криптотрейдинга»
              </div>
              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                ComforTrade — это то, как должны выглядеть современные криптобиржи: быстро, понятно и безопасно. Очень доволен выбором.
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
                Статьи, руководства и новости о криптовалюте и торговле. Будьте в курсе трендов и обновлений.
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
                  alt="Лучшая платформа для торговли BTC"
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
                  Лучшая платформа для торговли BTC с телефона
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
                  alt="Лучший криптокошелёк"
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
                  Какой самый надёжный криптокошелёк 2020 года?
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
                  alt="Лучшие крипто-приложения"
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
                  5 крипто-приложений, которые стоит попробовать
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
              Скачайте криптокошелёк будущего уже сегодня
            </h2>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.96-3.24-1.44-1.88-.78-3.24-1.35-4.13-1.7C6.58 17.67 5.39 17 4.56 16.09c-.83-.9-1.24-2.03-1.24-3.4 0-1.35.44-2.74 1.32-4.17.88-1.43 2.04-2.76 3.48-3.98 1.44-1.23 3.1-2.15 4.97-2.75.78-.25 1.58-.44 2.39-.59.41-.08.82-.14 1.23-.17.41-.03.82-.05 1.23-.05.41 0 .82.02 1.23.05.41.03.82.09 1.23.17.81.15 1.61.34 2.39.59 1.87.6 3.53 1.52 4.97 2.75 1.44 1.22 2.6 2.55 3.48 3.98.88 1.43 1.32 2.82 1.32 4.17 0 1.37-.41 2.5-1.24 3.4-.83.91-2.02 1.58-3.64 1.95-.89.35-2.25.92-4.13 1.7-1.16.48-2.15.94-3.24 1.44-1.03.48-2.1.55-3.08-.4-.27-.26-.48-.58-.65-.92-.17-.35-.26-.72-.26-1.09 0-.37.09-.74.26-1.09.17-.34.38-.66.65-.92.98-.95 2.05-.88 3.08-.4 1.09.5 2.08.96 3.24 1.44 1.88.78 3.24 1.35 4.13 1.7 1.62.37 2.81 1.04 3.64 1.95.83.9 1.24 2.03 1.24 3.4 0 1.35-.44 2.74-1.32 4.17-.88 1.43-2.04 2.76-3.48 3.98-1.44 1.23-3.1 2.15-4.97 2.75-.78.25-1.58.44-2.39.59-.41.08-.82.14-1.23.17-.41.03-.82.05-1.23.05-.41 0-.82-.02-1.23-.05-.41-.03-.82-.09-1.23-.17-.81-.15-1.61-.34-2.39-.59-1.87-.6-3.53-1.52-4.97-2.75-1.44-1.22-2.6-2.55-3.48-3.98-.88-1.43-1.32-2.82-1.32-4.17 0-1.37.41-2.5 1.24-3.4.83-.91 2.02-1.58 3.64-1.95.89-.35 2.25-.92 4.13-1.7 1.16-.48 2.15-.94 3.24-1.44 1.03-.48 2.1-.55 3.08.4.27.26.48.58.65.92.17.35.26.72.26 1.09 0 .37-.09.74-.26 1.09-.17.34-.38.66-.65.92z"/>
                </svg>
                Скачать для iOS
              </button>
              <button className="bg-[#3347ff] text-white px-8 py-4 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5508 0 .9993.4482.9993.9993.0001.5511-.4485.9997-.9993.9997m-11.022 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5508 0 .9993.4482.9993.9993 0 .5511-.4485.9997-.9993.9997m11.022-6.2136H6.082c-.8042 0-1.4587-.6545-1.4587-1.4587s.6545-1.4587 1.4587-1.4587h11.439c.8042 0 1.4587.6545 1.4587 1.4587s.6545 1.4587-1.4587 1.4587M17.523 21.59H6.082c-4.689 0-8.5-3.8107-8.5-8.4997s3.811-8.4997 8.5-8.4997h11.439c4.689 0 8.5 3.8107 8.5 8.4997s-3.811 8.4997-8.5 8.4997M6.082 7.5903c-2.8956 0-5.2497 2.3541-5.2497 5.2497s2.3541 5.2497 5.2497 5.2497h11.439c2.8956 0 5.2497-2.3541 5.2497-5.2497s-2.3541-5.2497-5.2497-5.2497H6.082z"/>
                </svg>
                Скачать для Android
              </button>
            </div>
          </div>

          {/* Large Image - Cropped at half height */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl" style={{ maxHeight: '400px', overflow: 'hidden' }}>
              <Image
                src="/images/end.png"
                alt="Криптокошелёк — приложение"
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
                Удобный криптокошелёк для покупки, хранения и торговли. Безопасно, быстро и просто.
              </p>
            </div>

            {/* Right Section - Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-[#3347ff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.96-3.24-1.44-1.88-.78-3.24-1.35-4.13-1.7C6.58 17.67 5.39 17 4.56 16.09c-.83-.9-1.24-2.03-1.24-3.4 0-1.35.44-2.74 1.32-4.17.88-1.43 2.04-2.76 3.48-3.98 1.44-1.23 3.1-2.15 4.97-2.75.78-.25 1.58-.44 2.39-.59.41-.08.82-.14 1.23-.17.41-.03.82-.05 1.23-.05.41 0 .82.02 1.23.05.41.03.82.09 1.23.17.81.15 1.61.34 2.39.59 1.87.6 3.53 1.52 4.97 2.75 1.44 1.22 2.6 2.55 3.48 3.98.88 1.43 1.32 2.82 1.32 4.17 0 1.37-.41 2.5-1.24 3.4-.83.91-2.02 1.58-3.64 1.95-.89.35-2.25.92-4.13 1.7-1.16.48-2.15.94-3.24 1.44-1.03.48-2.1.55-3.08-.4-.27-.26-.48-.58-.65-.92-.17-.35-.26-.72-.26-1.09 0-.37.09-.74.26-1.09.17-.34.38-.66.65-.92.98-.95 2.05-.88 3.08-.4 1.09.5 2.08.96 3.24 1.44 1.88.78 3.24 1.35 4.13 1.7 1.62.37 2.81 1.04 3.64 1.95.83.9 1.24 2.03 1.24 3.4 0 1.35-.44 2.74-1.32 4.17-.88 1.43-2.04 2.76-3.48 3.98-1.44 1.23-3.1 2.15-4.97 2.75-.78.25-1.58.44-2.39.59-.41.08-.82.14-1.23.17-.41.03-.82.05-1.23.05-.41 0-.82-.02-1.23-.05-.41-.03-.82-.09-1.23-.17-.81-.15-1.61-.34-2.39-.59-1.87-.6-3.53-1.52-4.97-2.75-1.44-1.22-2.6-2.55-3.48-3.98-.88-1.43-1.32-2.82-1.32-4.17 0-1.37.41-2.5 1.24-3.4.83-.91 2.02-1.58 3.64-1.95.89-.35 2.25-.92 4.13-1.7 1.16-.48 2.15-.94 3.24-1.44 1.03-.48 2.1-.55 3.08.4.27.26.48.58.65.92.17.35.26.72.26 1.09 0 .37-.09.74-.26 1.09-.17.34-.38.66-.65.92z"/>
                </svg>
                Скачать для iOS
              </button>
              <button className="bg-[#3347ff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a3ae6] transition-colors flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5508 0 .9993.4482.9993.9993.0001.5511-.4485.9997-.9993.9997m-11.022 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5508 0 .9993.4482.9993.9993 0 .5511-.4485.9997-.9993.9997m11.022-6.2136H6.082c-.8042 0-1.4587-.6545-1.4587-1.4587s.6545-1.4587 1.4587-1.4587h11.439c.8042 0 1.4587.6545 1.4587 1.4587s.6545 1.4587-1.4587 1.4587M17.523 21.59H6.082c-4.689 0-8.5-3.8107-8.5-8.4997s3.811-8.4997 8.5-8.4997h11.439c4.689 0 8.5 3.8107 8.5 8.4997s-3.811 8.4997-8.5 8.4997M6.082 7.5903c-2.8956 0-5.2497 2.3541-5.2497 5.2497s2.3541 5.2497 5.2497 5.2497h11.439c2.8956 0 5.2497-2.3541 5.2497-5.2497s-2.3541-5.2497-5.2497-5.2497H6.082z"/>
                </svg>
                Скачать для Android
              </button>
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
          }}
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
                onClick={() => {
                  setShowRegisterPanel(false);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setPromoCode('');
                  setAgreeToTerms(false);
                }}
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
                  onClick={() => {
                    setPanelMode('register');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                  }}
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
                  onClick={() => {
                    setPanelMode('login');
                    setError('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setPromoCode('');
                  }}
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
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white text-gray-800 font-medium hover:bg-gray-100 transition-colors"
                  disabled
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    required
                    disabled={isSubmitting}
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all disabled:opacity-50"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    required
                    minLength={6}
                    disabled={isSubmitting}
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all disabled:opacity-50"
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
                {panelMode === 'register' && (
                  <div className="relative group">
                    <input
                      id="panel-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder=" "
                      required
                      minLength={6}
                      disabled={isSubmitting}
                      className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all disabled:opacity-50"
                    />
                    <label
                      htmlFor="panel-confirm-password"
                      className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                        top-1/2 -translate-y-1/2
                        peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-400
                        peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-400"
                    >
                      Подтвердите пароль
                    </label>
                  </div>
                )}
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
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder=" "
                      disabled={isSubmitting}
                      className="peer w-full pt-5 pb-3 px-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 transition-all disabled:opacity-50"
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
                      disabled={isSubmitting}
                      className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-[#3347ff] focus:ring-[#3347ff]/50 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-400">
                      Согласен с <Link href="/policy/terms" className="text-[#3347ff] hover:underline">условиями использования</Link> и <Link href="/policy/privacy" className="text-[#3347ff] hover:underline">политикой конфиденциальности</Link>
                    </span>
                  </label>
                )}
                <button
                  type="submit"
                  disabled={(panelMode === 'register' && !agreeToTerms) || isSubmitting}
                  className="w-full py-3 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? (panelMode === 'login' ? 'Вход...' : 'Регистрация...') 
                    : (panelMode === 'login' ? 'Войти' : 'Зарегистрироваться')
                  }
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
