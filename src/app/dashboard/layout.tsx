import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import {
  QrCode,
  Key,
  FileJson,
  Shield,
  LogOut,
  User as UserIcon,
  Compass,
} from 'lucide-react';
import { SignOutButton } from '@/components/signout-button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user;
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900/50 border-r border-neutral-800 flex flex-col backdrop-blur-md shrink-0">
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-md tracking-tight">Live QR</span>
            <span className="block text-[10px] text-neutral-500 font-medium leading-none mt-0.5">
              Secure Rotation
            </span>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition"
          >
            <QrCode className="w-4 h-4" />
            My QR Codes
          </Link>
          <Link
            href="/dashboard/keys"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition"
          >
            <Key className="w-4 h-4" />
            API Keys & Webhooks
          </Link>
          <Link
            href="/dashboard/docs"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition"
          >
            <FileJson className="w-4 h-4" />
            API Documentation
          </Link>
          
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition border border-dashed border-indigo-900/30 bg-indigo-950/5"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-200">Admin Settings</span>
            </Link>
          )}
        </nav>

        {/* User profile footer info */}
        <div className="p-4 border-t border-neutral-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold overflow-hidden">
              {user.image ? (
                <img src={user.image} alt={user.name || 'User'} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white truncate leading-tight">
                {user.name || 'Account'}
              </span>
              <span className="block text-xs text-neutral-500 truncate mt-0.5">
                {user.email}
              </span>
            </div>
            <div className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
              {user.role}
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/10 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Compass className="w-4 h-4 text-neutral-500" />
            <span>Workspace</span>
            <span>/</span>
            <span className="text-white font-medium">Live QR Platform</span>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
