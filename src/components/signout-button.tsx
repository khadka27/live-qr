'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 border border-neutral-800 hover:border-red-950 hover:bg-red-950/20 rounded-lg transition duration-200 cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign Out
    </button>
  );
}
