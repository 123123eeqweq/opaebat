import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Как начать | ComforTrade',
  description: 'Начните торговать с COMFORTRADE: регистрация, верификация, первый депозит и первые сделки.',
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
