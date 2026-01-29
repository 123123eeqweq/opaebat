'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile?tab=trade');
  }, [router]);
  return null;
}
