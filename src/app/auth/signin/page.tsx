'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Github, Chrome, Lock, Mail, User, ShieldCheck } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Read error from search params (NextAuth default error forwarding)
  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError) {
      if (authError === 'CredentialsSignin') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An error occurred during authentication.');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (tab === 'signup') {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Registration failed');
          setLoading(false);
          return;
        }

        setMessage('Registered successfully! Signing you in...');
        
        // Auto-login after registration
        const loginRes = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          setError('Auto-signin failed. Please login manually.');
          setTab('signin');
          setLoading(false);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error(err);
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    } else {
      // Sign In Flow
      try {
        const loginRes = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (loginRes?.error) {
          setError('Invalid email or password.');
          setLoading(false);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred during login.');
        setLoading(false);
      }
    }
  };

  const handleOAuth = (provider: 'github' | 'google') => {
    setError('');
    setLoading(true);
    signIn(provider, { callbackUrl: '/dashboard' });
  };

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header logo & title */}
      <div className="flex flex-col items-center mb-8 relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 mb-3">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Live QR</h2>
        <p className="text-xs text-neutral-400 mt-1">Dynamic Secure Verification Platform</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-neutral-950 border border-neutral-800/80 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => {
            setTab('signin');
            setError('');
          }}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-all duration-200 ${
            tab === 'signin'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('signup');
            setError('');
          }}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-all duration-200 ${
            tab === 'signup'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Message alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400 text-xs font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative">
        {tab === 'signup' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition duration-200"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition duration-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-500 outline-none transition duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition duration-200 flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : tab === 'signup' ? (
            'Sign Up'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center my-6">
        <div className="flex-grow border-t border-neutral-800"></div>
        <span className="flex-shrink mx-4 text-neutral-500 text-xs font-medium">Or continue with</span>
        <div className="flex-grow border-t border-neutral-800"></div>
      </div>

      {/* Social Providers */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuth('github')}
          className="flex items-center justify-center gap-2 border border-neutral-800 hover:bg-neutral-800/50 bg-neutral-950 text-white py-2 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50"
        >
          <Github className="w-4 h-4" />
          GitHub
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleOAuth('google')}
          className="flex items-center justify-center gap-2 border border-neutral-800 hover:bg-neutral-800/50 bg-neutral-950 text-white py-2 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50"
        >
          <Chrome className="w-4 h-4" />
          Google
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-6">
      <Suspense fallback={
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }>
        <SignInContent />
      </Suspense>
    </div>
  );
}
