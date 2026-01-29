import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Отзывы | ComforTrade',
  description: 'Отзывы клиентов о COMFORTRADE — надёжный брокер для торговли на валютном рынке.',
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
