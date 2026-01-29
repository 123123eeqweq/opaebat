'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Footer from '@/components/Footer'

export default function EducationPage() {
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState('RU')
  const [showRegisterPanel, setShowRegisterPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'login' | 'register'>('register')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<number | null>(0)

  const articles = [
    {
      id: 0,
      title: 'Основы торговли на фондовом рынке',
      category: 'Для начинающих',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Введение в торговлю на фондовом рынке</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Торговля на фондовом рынке — это процесс покупки и продажи ценных бумаг с целью получения прибыли. 
          Для успешного старта важно понимать основные принципы работы рынка.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Что такое фондовый рынок?</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Фондовый рынок — это организованная площадка, где инвесторы могут покупать и продавать акции компаний, 
          облигации и другие финансовые инструменты. Рынок работает по принципу спроса и предложения, 
          что определяет цены на активы.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Основные понятия</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Акция</strong> — доля владения в компании</li>
          <li><strong>Облигация</strong> — долговое обязательство</li>
          <li><strong>Индекс</strong> — показатель состояния рынка</li>
          <li><strong>Брокер</strong> — посредник между инвестором и рынком</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">С чего начать?</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Начните с изучения основ, выберите надежного брокера, откройте демо-счет для практики 
          и постепенно переходите к реальной торговле с небольших сумм.
        </p>
      `
    },
    {
      id: 1,
      title: 'Технический анализ: основы',
      category: 'Анализ',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Технический анализ для трейдеров</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Технический анализ — это метод прогнозирования движения цен на основе изучения графиков 
          и исторических данных. Это один из основных инструментов успешного трейдера.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Основные инструменты</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Графики</strong> — свечные, линейные, баровые</li>
          <li><strong>Индикаторы</strong> — RSI, MACD, Moving Averages</li>
          <li><strong>Уровни поддержки и сопротивления</strong></li>
          <li><strong>Фигуры технического анализа</strong> — треугольники, флаги, головы и плечи</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Тренды и их типы</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Тренд — это направление движения цены. Различают восходящий (бычий), нисходящий (медвежий) 
          и боковой (флэт) тренды. Умение определять тренд — ключ к успешной торговле.
        </p>
      `
    },
    {
      id: 2,
      title: 'Управление рисками',
      category: 'Риск-менеджмент',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Управление рисками в трейдинге</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Правильное управление рисками — это основа долгосрочного успеха в торговле. 
          Без этого даже самая прибыльная стратегия может привести к потере капитала.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Правило 2%</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Никогда не рискуйте более 2% от вашего торгового капитала на одну сделку. 
          Это правило помогает сохранить капитал даже при серии неудачных сделок.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Стоп-лосс и тейк-профит</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Всегда устанавливайте стоп-лосс (уровень ограничения убытков) и тейк-профит 
          (уровень фиксации прибыли) перед открытием позиции. Это дисциплинирует и защищает ваш капитал.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Диверсификация</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Не вкладывайте все средства в один актив. Распределяйте капитал между разными инструментами 
          и рынками для снижения общего риска портфеля.
        </p>
      `
    },
    {
      id: 3,
      title: 'Фундаментальный анализ',
      category: 'Анализ',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Фундаментальный анализ рынка</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Фундаментальный анализ изучает экономические, финансовые и другие факторы, 
          влияющие на стоимость активов. Это долгосрочный подход к инвестированию.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Ключевые показатели</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>P/E (Price/Earnings)</strong> — соотношение цены к прибыли</li>
          <li><strong>ROE (Return on Equity)</strong> — рентабельность собственного капитала</li>
          <li><strong>Долг/Капитал</strong> — показатель финансовой устойчивости</li>
          <li><strong>Выручка и прибыль</strong> — динамика роста компании</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Макроэкономические факторы</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Следите за ключевыми экономическими индикаторами: ВВП, инфляция, процентные ставки, 
          уровень безработицы. Эти факторы влияют на весь рынок в целом.
        </p>
      `
    },
    {
      id: 4,
      title: 'Торговые стратегии для новичков',
      category: 'Стратегии',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Простые торговые стратегии</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Для начинающих трейдеров важно начать с простых и понятных стратегий, 
          которые можно освоить и применять на практике.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Стратегия "Следование за трендом"</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Основная идея — покупать на растущем рынке и продавать на падающем. 
          Используйте скользящие средние для определения направления тренда.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Стратегия "Поддержка и сопротивление"</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Торгуйте от ключевых уровней поддержки и сопротивления. 
          Покупайте у поддержки, продавайте у сопротивления.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Важные правила</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li>Начинайте с демо-счета</li>
          <li>Ведите торговый дневник</li>
          <li>Следуйте своему плану</li>
          <li>Не торгуйте на эмоциях</li>
        </ul>
      `
    },
    {
      id: 5,
      title: 'Психология трейдинга',
      category: 'Психология',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Психология успешного трейдера</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Психология играет ключевую роль в торговле. Эмоции могут разрушить даже самую 
          продуманную стратегию. Учитесь контролировать себя.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Основные эмоциональные ловушки</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Жадность</strong> — желание получить больше, чем позволяет стратегия</li>
          <li><strong>Страх</strong> — боязнь упустить прибыль или понести убытки</li>
          <li><strong>Надежда</strong> — удержание убыточной позиции в надежде на разворот</li>
          <li><strong>Месть</strong> — попытка отыграться после убытка</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Как сохранять дисциплину</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Создайте четкий торговый план и следуйте ему неукоснительно. 
          Делайте перерывы, не торгуйте в стрессе, анализируйте свои ошибки и учитесь на них.
        </p>
      `
    },
    {
      id: 6,
      title: 'Валютные пары: как выбрать',
      category: 'Форекс',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Выбор валютных пар для торговли</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          На валютном рынке представлены сотни валютных пар, но не все подходят для начинающих. 
          Важно выбрать правильные инструменты для вашего уровня и стиля торговли.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Major пары (основные)</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          EUR/USD, GBP/USD, USD/JPY, USD/CHF — самые ликвидные пары с низкими спредами. 
          Идеальны для новичков благодаря предсказуемости и обилию аналитики.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Minor пары (кросс-пары)</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          EUR/GBP, EUR/JPY, GBP/JPY — пары без доллара США. 
          Могут иметь более высокую волатильность и спреды.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Exotic пары (экзотические)</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          USD/TRY, USD/ZAR, EUR/PLN — пары с валютами развивающихся стран. 
          Высокая волатильность и спреды, подходят только опытным трейдерам.
        </p>
      `
    },
    {
      id: 7,
      title: 'Криптовалюты: основы',
      category: 'Криптовалюты',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Торговля криптовалютами</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Криптовалютный рынок работает 24/7 и отличается высокой волатильностью. 
          Это открывает возможности для прибыли, но требует особого подхода к управлению рисками.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Основные криптовалюты</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Bitcoin (BTC)</strong> — первая и самая крупная криптовалюта</li>
          <li><strong>Ethereum (ETH)</strong> — платформа для смарт-контрактов</li>
          <li><strong>Altcoins</strong> — альтернативные криптовалюты</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Особенности крипто-трейдинга</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Криптовалюты торгуются круглосуточно, имеют высокую волатильность и могут 
          резко изменяться в цене. Важно использовать стоп-лоссы и не инвестировать больше, 
          чем можете позволить себе потерять.
        </p>
      `
    },
    {
      id: 8,
      title: 'RSI (Relative Strength Index)',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">RSI - Индикатор относительной силы</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Индикатор относительной силы (RSI) — это осциллятор импульса, который измеряет величину 
          недавних изменений цены для оценки условий перекупленности или перепроданности актива.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Как работает RSI</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          RSI колеблется от 0 до 100. Значения выше 70 обычно указывают на перекупленность актива, 
          что может сигнализировать о потенциальном развороте вниз. Значения ниже 30 указывают на 
          перепроданность и возможный разворот вверх.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Интерпретация сигналов</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>RSI > 70</strong> — перекупленность, возможна коррекция вниз</li>
          <li><strong>RSI < 30</strong> — перепроданность, возможен отскок вверх</li>
          <li><strong>RSI = 50</strong> — нейтральная зона</li>
          <li><strong>Дивергенция</strong> — расхождение RSI и цены может предвещать разворот</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Применение в торговле</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          RSI используется для определения точек входа и выхода. При выходе из зоны перепроданности 
          (выше 30) можно рассматривать покупку. При выходе из зоны перекупленности (ниже 70) — продажу.
        </p>
      `
    },
    {
      id: 9,
      title: 'MACD',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">MACD - Индикатор схождения и расхождения</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          MACD (Moving Average Convergence Divergence) — это трендовый индикатор импульса, который показывает 
          взаимосвязь между двумя скользящими средними цены актива.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Компоненты MACD</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Линия MACD</strong> — разница между EMA 12 и EMA 26</li>
          <li><strong>Сигнальная линия</strong> — EMA 9 от линии MACD</li>
          <li><strong>Гистограмма</strong> — разница между линией MACD и сигнальной линией</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Торговые сигналы</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Бычий сигнал:</strong> Линия MACD пересекает сигнальную линию снизу вверх — возможен рост цены.<br/>
          <strong>Медвежий сигнал:</strong> Линия MACD пересекает сигнальную линию сверху вниз — возможен спад цены.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Дивергенция</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Когда цена формирует новый максимум, а MACD — нет (медвежья дивергенция), это может указывать 
          на ослабление тренда и возможный разворот. И наоборот для бычьей дивергенции.
        </p>
      `
    },
    {
      id: 10,
      title: 'Скользящие средние (MA)',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Скользящие средние в техническом анализе</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Скользящие средние сглаживают ценовые колебания и помогают определить направление тренда. 
          Это один из самых популярных и простых в использовании индикаторов.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Типы скользящих средних</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>SMA (Simple Moving Average)</strong> — простая скользящая средняя, среднее арифметическое цен</li>
          <li><strong>EMA (Exponential Moving Average)</strong> — экспоненциальная, больше веса недавним ценам</li>
          <li><strong>WMA (Weighted Moving Average)</strong> — взвешенная скользящая средняя</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Популярные периоды</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Краткосрочные:</strong> 5, 10, 20 периодов — для быстрых сигналов<br/>
          <strong>Среднесрочные:</strong> 50, 100 периодов — для определения среднесрочного тренда<br/>
          <strong>Долгосрочные:</strong> 200 периодов — для определения основного тренда
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Торговые сигналы</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Золотой крест:</strong> Быстрая MA пересекает медленную снизу вверх — сигнал на покупку.<br/>
          <strong>Мертвый крест:</strong> Быстрая MA пересекает медленную сверху вниз — сигнал на продажу.
        </p>
      `
    },
    {
      id: 11,
      title: 'Полосы Боллинджера',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Полосы Боллинджера</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Полосы Боллинджера — это индикатор волатильности, состоящий из трех линий: средней (SMA) 
          и двух полос (верхней и нижней), которые отображают стандартные отклонения от средней.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Как работают полосы</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Когда цена касается верхней полосы — актив может быть перекуплен. Когда касается нижней — перепродан. 
          Ширина полос показывает волатильность: узкие полосы — низкая волатильность, широкие — высокая.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Торговые стратегии</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Отскок от полос</strong> — покупка у нижней полосы, продажа у верхней</li>
          <li><strong>Пробой полос</strong> — сильное движение за пределы полос может продолжиться</li>
          <li><strong>Сжатие полос</strong> — сужение полос предвещает сильное движение</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Настройки</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Стандартные настройки: период 20, стандартное отклонение 2. Можно корректировать в зависимости 
          от таймфрейма и волатильности актива.
        </p>
      `
    },
    {
      id: 12,
      title: 'Стохастик',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Стохастический осциллятор</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Стохастик — это индикатор импульса, который сравнивает текущую цену закрытия с диапазоном цен 
          за определенный период времени. Помогает определить моменты разворота тренда.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Как читать Стохастик</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Индикатор колеблется от 0 до 100. Значения выше 80 указывают на перекупленность, ниже 20 — на перепроданность. 
          Пересечение линий %K и %D дает торговые сигналы.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Торговые сигналы</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Покупка:</strong> %K пересекает %D снизу вверх в зоне перепроданности (ниже 20)</li>
          <li><strong>Продажа:</strong> %K пересекает %D сверху вниз в зоне перекупленности (выше 80)</li>
          <li><strong>Дивергенция:</strong> расхождение с ценой может предвещать разворот</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Применение</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Стохастик наиболее эффективен в боковом тренде (флэте). В сильном тренде может давать ложные сигналы, 
          поэтому лучше использовать в сочетании с другими индикаторами.
        </p>
      `
    },
    {
      id: 13,
      title: 'Уровни Фибоначчи',
      category: 'Индикаторы',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Уровни коррекции Фибоначчи</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Уровни Фибоначчи — это горизонтальные линии на графике, которые показывают потенциальные уровни 
          поддержки и сопротивления на основе математических соотношений последовательности Фибоначчи.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Основные уровни</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Ключевые уровни коррекции: 23.6%, 38.2%, 50%, 61.8%, 78.6%. Уровень 61.8% (золотое сечение) 
          считается наиболее важным. Цена часто отскакивает от этих уровней или делает паузу.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Как использовать</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li>Найдите значимый максимум и минимум движения</li>
          <li>Нанесите уровни Фибоначчи от минимума к максимуму (для восходящего тренда)</li>
          <li>Ищите отскоки или пробои на уровнях 38.2%, 50%, 61.8%</li>
          <li>Используйте в сочетании с другими индикаторами для подтверждения</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Расширения Фибоначчи</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Помимо коррекций, уровни Фибоначчи используются для определения целей движения: 127.2%, 161.8%, 261.8%. 
          Эти уровни показывают, куда может продолжиться тренд после коррекции.
        </p>
      `
    },
    {
      id: 14,
      title: 'Стратегия "Тренд-фолловинг"',
      category: 'Стратегии',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Стратегия следования за трендом</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Стратегия тренд-фолловинг основана на принципе "тренд — ваш друг". Трейдер входит в позицию 
          в направлении основного тренда и удерживает её до появления сигналов разворота. Подходит для среднесрочной торговли.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Используемые индикаторы</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>EMA 50 и EMA 200</strong> — для определения направления тренда</li>
          <li><strong>MACD</strong> — для подтверждения сигналов и определения моментума</li>
          <li><strong>RSI</strong> — для фильтрации входов (избегаем зон перекупленности/перепроданности)</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Правила входа в позицию</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Сигнал на покупку:</strong><br/>
          • EMA 50 находится выше EMA 200 (восходящий тренд)<br/>
          • MACD показывает бычий сигнал (линия MACD выше сигнальной)<br/>
          • RSI находится в диапазоне 40-60 (не перекуплен и не перепродан)<br/>
          • Цена откатывается к EMA 50 и отскакивает вверх
        </p>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Сигнал на продажу:</strong><br/>
          • EMA 50 находится ниже EMA 200 (нисходящий тренд)<br/>
          • MACD показывает медвежий сигнал (линия MACD ниже сигнальной)<br/>
          • RSI находится в диапазоне 40-60<br/>
          • Цена откатывается к EMA 50 и отскакивает вниз
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Управление рисками</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Стоп-лосс:</strong> 2% от торгового капитала на одну сделку</li>
          <li><strong>Тейк-профит:</strong> соотношение 1:2 или 1:3 к стоп-лоссу</li>
          <li><strong>Выход:</strong> при пересечении EMA 50 и EMA 200 в обратном направлении</li>
          <li><strong>Таймфрейм:</strong> рекомендуется H1, H4 или D1</li>
        </ul>
      `
    },
    {
      id: 15,
      title: 'Стратегия "Поддержка/Сопротивление"',
      category: 'Стратегии',
      content: `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Торговля от уровней поддержки и сопротивления</h2>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Эта стратегия основана на торговле от ключевых уровней поддержки и сопротивления. Входы происходят 
          при отскоке от этих уровней с подтверждением индикаторами. Идеально подходит для внутридневной торговли.
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Используемые инструменты</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Горизонтальные уровни</strong> — поддержки и сопротивления, построенные на основе исторических максимумов и минимумов</li>
          <li><strong>RSI</strong> — для подтверждения разворота (выход из зоны перекупленности/перепроданности)</li>
          <li><strong>Объемы</strong> — для подтверждения силы уровня (повышенный объем при отскоке)</li>
          <li><strong>Свечные паттерны</strong> — разворотные свечи (молот, поглощение) у уровней</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Правила входа в позицию</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Сигнал на покупку у поддержки:</strong><br/>
          • Цена приближается к уровню поддержки<br/>
          • Формируется разворотная свеча (молот, поглощение бычье)<br/>
          • RSI выходит из зоны перепроданности (выше 30)<br/>
          • Повышенный объем подтверждает отскок
        </p>
        <p class="text-gray-700 mb-4 leading-relaxed">
          <strong>Сигнал на продажу у сопротивления:</strong><br/>
          • Цена приближается к уровню сопротивления<br/>
          • Формируется разворотная свеча (падающая звезда, поглощение медвежье)<br/>
          • RSI выходит из зоны перекупленности (ниже 70)<br/>
          • Повышенный объем подтверждает отскок
        </p>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Управление рисками</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Стоп-лосс:</strong> за уровнем поддержки/сопротивления (10-20 пунктов)</li>
          <li><strong>Тейк-профит:</strong> на следующем уровне или соотношение 1:1.5 к стоп-лоссу</li>
          <li><strong>Выход:</strong> при пробое уровня в обратном направлении</li>
          <li><strong>Таймфрейм:</strong> M15, M30, H1 для внутридневной торговли</li>
        </ul>
        <h3 class="text-xl font-bold text-gray-900 mb-3 mt-6">Важные замечания</h3>
        <p class="text-gray-700 mb-4 leading-relaxed">
          Чем чаще уровень тестировался и удерживался, тем он сильнее. Избегайте торговли на слабых уровнях. 
          Всегда ждите подтверждения отскока, не входите заранее.
        </p>
      `
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
            <Link href="/reviews" className="text-gray-300 hover:text-white transition-colors">Отзывы</Link>
            <Link href="/education" className="text-white font-medium">Обучение</Link>
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
            <span className="text-white">Обучение</span>
          </nav>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">Обучение</h1>
          <p className="text-lg text-gray-400 max-w-2xl">
            Материалы и уроки по торговле на валютном и криптовалютном рынках. Осваивайте стратегии и инструменты COMFORTRADE.
          </p>
        </div>
      </section>

      {/* Education Content Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Left Sidebar - Articles Menu */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sticky top-24">
                <nav className="space-y-6">
                  {/* Статьи */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Статьи</h4>
                    <div className="space-y-2">
                      {articles.filter(a => a.category !== 'Индикаторы' && a.category !== 'Стратегии').map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            selectedArticle === article.id
                              ? 'bg-[#3347ff]/10 text-[#3347ff] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium">{article.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Индикаторы */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Индикаторы</h4>
                    <div className="space-y-2">
                      {articles.filter(a => a.category === 'Индикаторы').map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            selectedArticle === article.id
                              ? 'bg-[#3347ff]/10 text-[#3347ff] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium">{article.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Стратегии */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Стратегии</h4>
                    <div className="space-y-2">
                      {articles.filter(a => a.category === 'Стратегии').map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            selectedArticle === article.id
                              ? 'bg-[#3347ff]/10 text-[#3347ff] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm font-medium">{article.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </nav>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 md:p-12">
                {selectedArticle !== null ? (
                  <div>
                    <div className="mb-6">
                      <span className="inline-block px-3 py-1 rounded-md bg-[#3347ff]/10 text-[#3347ff] text-sm font-medium mb-3">
                        {articles[selectedArticle].category}
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {articles[selectedArticle].title}
                      </h2>
                    </div>
                    <div 
                      className="article-content text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: articles[selectedArticle].content }}
                      style={{
                        lineHeight: '1.75'
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-gray-600">Выберите статью из меню слева</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#3347ff] to-[#2a3ae6] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Готовы начать торговать?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам трейдеров, которые уже используют COMFORTRADE для успешной торговли на финансовых рынках.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => { setPanelMode('register'); setShowRegisterPanel(true); }}
                className="px-8 py-4 rounded-lg bg-white text-[#3347ff] font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Создать аккаунт
              </button>
              <Link
                href="/start"
                className="px-8 py-4 rounded-lg bg-transparent border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Узнать больше
              </Link>
            </div>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Быстрая регистрация</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Демо-счет для практики</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>24/7 поддержка</span>
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

      <Footer />

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
