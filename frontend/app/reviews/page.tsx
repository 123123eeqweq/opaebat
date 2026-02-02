'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'

export default function ReviewsPage() {
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('RU')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 0,
    text: ''
  })
  const [hoveredRating, setHoveredRating] = useState(0)

  const reviews = [
    {
      id: 1,
      name: 'Александр Петров',
      rating: 5,
      text: 'Отличный брокер! Торгую уже полгода, всё работает стабильно. Исполнение сделок Call/Put быстрое, доходность до 89%. Удобный терминал и поддержка 24/7.',
      date: '15 января 2025',
      verified: true
    },
    {
      id: 2,
      name: 'Мария Иванова',
      rating: 5,
      text: 'Очень довольна ComforTrade. Начала с демо-счёта, потом перешла на реальный. Обучение на сайте помогло разобраться с основами. Рекомендую новичкам!',
      date: '12 января 2025',
      verified: true
    },
    {
      id: 3,
      name: 'Дмитрий Смирнов',
      rating: 4,
      text: 'Хороший брокер, всё устраивает. Графики и индикаторы на уровне. Быстрый вывод средств, прозрачные условия. Торгую Forex и крипту.',
      date: '10 января 2025',
      verified: true
    },
    {
      id: 4,
      name: 'Елена Козлова',
      rating: 5,
      text: 'Лучшая платформа для торговли Forex и криптой! Терминал удобный, можно торговать в любое время. Высокая доходность по Call/Put. Спасибо команде!',
      date: '8 января 2025',
      verified: true
    },
    {
      id: 5,
      name: 'Игорь Волков',
      rating: 5,
      text: 'Торгую на разных платформах, но ComforTrade — одна из лучших. Честная доходность, мгновенное исполнение. Поддержка всегда на связи.',
      date: '5 января 2025',
      verified: true
    },
    {
      id: 6,
      name: 'Ольга Новикова',
      rating: 4,
      text: 'Хорошая платформа для начинающих. Демо-счёт для практики — отлично! Начала с малого, постепенно увеличиваю депозит. Всё прозрачно и понятно.',
      date: '3 января 2025',
      verified: true
    },
    {
      id: 7,
      name: 'Сергей Лебедев',
      rating: 5,
      text: 'Профессиональный терминал с отличными условиями. Торгую валютными парами EUR/USD, GBP/USD. Доходность фиксированная, без сюрпризов. Рекомендую!',
      date: '1 января 2025',
      verified: true
    },
    {
      id: 8,
      name: 'Анна Федорова',
      rating: 5,
      text: 'Отличный сервис! Регистрация заняла 5 минут. Торгую Forex и криптой, всё работает без сбоев. Вывод средств быстрый. Платформа как надо.',
      date: '28 декабря 2024',
      verified: true
    }
  ]

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
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">О компании</Link>
            <Link href="/reviews" className="text-white font-medium">Отзывы</Link>
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

      <section className="pt-24 bg-[#061230] relative overflow-hidden">
        <div className="absolute inset-0 opacity-85" style={{ backgroundImage: 'url(/images/small.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
        <div className="container mx-auto px-4 relative z-10 pt-8 pb-16 md:pt-12 md:pb-24">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label="Хлебные крошки">
            <Link href="/" className="hover:text-white transition-colors">Главная</Link>
            <span className="text-gray-500">→</span>
            <span className="text-white">Отзывы</span>
          </nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Отзывы</h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Отзывы трейдеров о ComforTrade — о терминале, торговле Forex и криптой, поддержке и исполнении сделок.
          </p>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 md:py-24 bg-[#f7f7fc]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Отзывы клиентов</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Реальные отзывы от трейдеров, которые используют ComforTrade для торговли на Forex и криптовалютах
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3347ff] to-[#2a3ae6] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{review.name}</h3>
                        {review.verified && (
                          <svg className="w-4 h-4 text-[#3347ff]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{review.date}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Review Form Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Оставьте свой отзыв</h2>
            <p className="text-lg text-gray-600">
              Поделитесь своим опытом торговли с ComforTrade
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 md:p-12">
            <form onSubmit={(e) => { e.preventDefault(); alert('Спасибо за ваш отзыв!'); setReviewForm({ name: '', email: '', rating: 0, text: '' }); }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative group">
                  <input
                    type="text"
                    id="review-name"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    placeholder=" "
                    required
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all"
                  />
                  <label
                    htmlFor="review-name"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-600
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-600"
                  >
                    Ваше имя
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="email"
                    id="review-email"
                    value={reviewForm.email}
                    onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })}
                    placeholder=" "
                    required
                    className="peer w-full pt-5 pb-3 px-4 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all"
                  />
                  <label
                    htmlFor="review-email"
                    className="absolute left-4 text-gray-500 transition-all duration-200 pointer-events-none origin-left
                      top-1/2 -translate-y-1/2
                      peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gray-600
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-600"
                  >
                    Email
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Оценка</label>
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => {
                    const starValue = i + 1
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: starValue })}
                        onMouseEnter={() => setHoveredRating(starValue)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 transition-colors ${
                            starValue <= (hoveredRating || reviewForm.rating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
                {reviewForm.rating === 0 && (
                  <p className="text-sm text-red-500 mt-2">Пожалуйста, выберите оценку</p>
                )}
              </div>
              <div>
                <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-3">
                  Ваш отзыв
                </label>
                <textarea
                  id="review-text"
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                  rows={6}
                  required
                  placeholder="Расскажите о своём опыте торговли с ComforTrade..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff] transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={reviewForm.rating === 0}
                className="w-full py-3 rounded-lg bg-[#3347ff] text-white font-medium hover:bg-[#2a3ae6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить отзыв
              </button>
            </form>
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
