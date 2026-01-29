import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'О компании | ComforTrade',
  description: 'COMFORTRADE — надёжный брокер для торговли на валютном рынке. Высокая доходность, широкий выбор инструментов.',
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
