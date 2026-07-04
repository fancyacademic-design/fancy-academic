'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function FloatingSupportButton() {
  return (
    <Link
      href="/support/chat"
      className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50 hover:bg-blue-700 transition-colors"
      title="الدعم الفني"
    >
      <MessageCircle size={24} />
    </Link>
  );
}