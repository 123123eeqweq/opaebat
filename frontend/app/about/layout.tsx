import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'О компании',
  description: 'COMFOTRADE — надёжный брокер для торговли на валютном и криптовалютном рынках. Высокая доходность, широкий выбор инструментов, профессиональная платформа для трейдинга.',
  keywords: ['о компании', 'брокер', 'COMFOTRADE', 'торговля', 'финансовые рынки'],
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
