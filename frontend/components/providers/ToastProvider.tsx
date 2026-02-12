'use client';

import { ToastContainer } from '@/components/ui/Toast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
