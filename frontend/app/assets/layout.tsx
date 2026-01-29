import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Активы | ComforTrade',
  description: 'Валютные пары, криптовалюта, индексы и другие инструменты для торговли на COMFORTRADE.',
}

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
