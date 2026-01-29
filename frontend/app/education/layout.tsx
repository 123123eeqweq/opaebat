import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Обучение | ComforTrade',
  description: 'Материалы и уроки по торговле на валютном и криптовалютном рынках от COMFORTRADE.',
}

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
