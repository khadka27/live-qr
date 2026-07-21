import React from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import { QrCode, Shield, RefreshCw, BarChart3, Key, Terminal, ArrowRight } from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="h-16 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">Live QR</span>
        </div>

        <div>
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition shadow"
            >
              Enter Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition border border-neutral-700"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center justify-center space-y-10 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4 max-w-2xl relative">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-xs font-semibold text-indigo-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure Dynamic Verification System</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Dynamically Rotating QR Verification Platform
          </h1>
          
          <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Build and manage secure QR codes that automatically rotate cryptographic tokens every 60 seconds. Anonymously validate redirections using Redis caching and log detailed geolocated analytics.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 relative">
          {session ? (
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-lg text-md transition shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              Go to Workspace
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3.5 rounded-lg text-md transition shadow-xl shadow-indigo-600/10 flex items-center justify-center"
              >
                Create Free Account
              </Link>
              <Link
                href="/auth/signin?tab=signin"
                className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-bold px-8 py-3.5 rounded-lg text-md transition flex items-center justify-center"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-16 w-full text-left relative">
          <div className="bg-neutral-900/50 border border-neutral-900 p-6 rounded-xl space-y-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <h3 className="font-bold text-white text-sm">60s Rotation Loop</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Cryptographic verification tokens rotate on schedule, leaving no trace of actual targets in QRs.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-900 p-6 rounded-xl space-y-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Strict Security</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Equipped with IP rate limits, IP hash anonymization, URL filters, and active webhook integrations.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-900 p-6 rounded-xl space-y-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Geo & Device Logs</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Gather metrics including browser, OS, and geolocated country splits represented in premium UI graphs.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-900 p-6 rounded-xl space-y-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Programmatic API</h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Complete REST API key management and full OpenAPI/Swagger handbook documentation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-neutral-900 flex items-center justify-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Live QR Platform. All rights reserved.
      </footer>
    </div>
  );
}
