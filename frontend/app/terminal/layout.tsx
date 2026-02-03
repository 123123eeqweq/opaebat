import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Торговый терминал',
  description: 'Профессиональный торговый терминал для торговли на финансовых рынках. Графики свечей и линейные графики, технические индикаторы, инструменты рисования, анализ рынка в реальном времени.',
  keywords: ['торговый терминал', 'графики', 'технический анализ', 'индикаторы', 'валютный рынок', 'трейдинг'],
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
