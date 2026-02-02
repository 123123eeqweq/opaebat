import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Торговый терминал',
  description: 'Профессиональный торговый терминал для бинарных опционов. Графики свечей и линейные графики, технические индикаторы, инструменты рисования, анализ рынка в реальном времени.',
  keywords: ['торговый терминал', 'графики', 'технический анализ', 'индикаторы', 'бинарные опционы', 'трейдинг'],
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
