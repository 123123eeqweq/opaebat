import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // iOS Safari: safe-area-inset работает только с cover
}

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  fallback: ['system-ui', 'arial'], // Fallback на случай проблем с загрузкой
})

export const metadata: Metadata = {
  title: {
    default: 'COMFORTRADE - Торговля на финансовых рынках',
    template: '%s | COMFORTRADE',
  },
  description: 'Торгуйте на валютных парах, криптовалютах и других активах. Современная платформа с интуитивным интерфейсом, техническими индикаторами и инструментами анализа.',
  keywords: ['валютный рынок', 'торговля', 'форекс', 'криптовалюта', 'финансовые рынки', 'трейдинг'],
  icons: {
    icon: [
      { url: '/images/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/images/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'COMFORTRADE',
    title: 'COMFORTRADE - Торговля на финансовых рынках',
    description: 'Торгуйте на валютных парах, криптовалютах и других активах.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className={montserrat.className}>{children}</body>
    </html>
  )
}
