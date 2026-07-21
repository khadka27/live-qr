'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Clock, ExternalLink, ShieldCheck, Download } from 'lucide-react';
import { generateQRCodeSVG } from '@/lib/qr-generator';

interface QRCodeDetails {
  id: string;
  name: string;
  destinationUrl: string;
  expirationSeconds: number;
  autoRefresh: boolean;
  maxUses: number | null;
  description: string | null;
  logoUrl: string | null;
  fgColor: string;
  bgColor: string;
  dotType: 'square' | 'rounded' | 'dots';
  frameType: 'none' | 'standard' | 'label';
  labelText: string | null;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  webhookUrl: string | null;
  createdAt: string;
  scanCount: number;
  currentToken: string | null;
  tokenExpiresAt: string | null;
}

export function QRViewerClient({ initialData }: { initialData: QRCodeDetails }) {
  const router = useRouter();
  const [qr, setQr] = useState<QRCodeDetails>(initialData);
  const [nowTick, setNowTick] = useState(Date.now());
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState('');

  // 1. Refresh details from backend
  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/qr/${qr.id}`);
      if (res.ok) {
        const data = await res.json();
        setQr(data);
      }
    } catch (err) {
      console.error('Error fetching QR details:', err);
    }
  };

  // 2. Immediate manual or automated rotation trigger
  const rotateToken = async () => {
    if (rotating) return;
    setRotating(true);
    setError('');
    try {
      const res = await fetch(`/api/qr/${qr.id}/regenerate`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setQr((prev) => ({
          ...prev,
          currentToken: data.token,
          tokenExpiresAt: data.expiresAt,
        }));
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to rotate token');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during token rotation.');
    } finally {
      setRotating(false);
    }
  };

  // 3. Update countdown ticks every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Handle countdown expiry and auto-rotation
  const expiresAtTime = qr.tokenExpiresAt ? new Date(qr.tokenExpiresAt).getTime() : 0;
  const secondsRemaining = expiresAtTime ? Math.max(0, Math.floor((expiresAtTime - nowTick) / 1000)) : 0;

  useEffect(() => {
    if (secondsRemaining <= 0 && expiresAtTime > 0 && qr.autoRefresh && !rotating) {
      // Countdown reached zero, rotate token immediately
      rotateToken();
    }
  }, [secondsRemaining, expiresAtTime, qr.autoRefresh, rotating]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 5. Generate current verification URL
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const encodedUrl = qr.currentToken
    ? `${appOrigin}/s/${qr.currentToken}`
    : `${appOrigin}/s/error`;

  // 6. Generate SVG string
  const qrSvgResult = generateQRCodeSVG(encodedUrl, {
    fgColor: qr.fgColor,
    bgColor: qr.bgColor,
    dotType: qr.dotType,
    frameType: qr.frameType,
    labelText: qr.labelText || undefined,
    logoUrl: qr.logoUrl || undefined,
    errorCorrection: qr.errorCorrection,
  });

  const handleDownloadSVG = () => {
    const blob = new Blob([qrSvgResult.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qr.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_viewer.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Active Rotation Loop</span>
        </div>
      </div>

      {/* Main Grid: QR display + Control settings details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Side: Large QR Code Panel */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center shadow-2xl relative">
          <div className="w-full max-w-[280px] aspect-square bg-white rounded-xl p-4 flex items-center justify-center shadow-inner relative group border border-neutral-800">
            {/* Injecting generated SVG QR */}
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: qrSvgResult.svg }}
            />

            {/* Rotating overlay spinner */}
            {rotating && (
              <div className="absolute inset-0 bg-neutral-950/80 rounded-xl flex flex-col items-center justify-center text-white gap-2 backdrop-blur-xs">
                <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs font-semibold font-mono text-indigo-400">Rotating token...</span>
              </div>
            )}
          </div>

          {/* Verification path label */}
          <div className="w-full mt-6 bg-neutral-950 border border-neutral-800/80 p-3 rounded-lg flex flex-col gap-1 text-center">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Encoders Routing Path</span>
            <span className="font-mono text-xs text-indigo-400 select-all truncate leading-relaxed">
              {encodedUrl}
            </span>
          </div>

          <button
            onClick={handleDownloadSVG}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-lg text-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Download Large SVG
          </button>
        </div>

        {/* Right Side: Rotation Status & Details */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{qr.name}</h2>
            <p className="text-neutral-400 text-xs mt-1 leading-relaxed">{qr.description || 'No description provided.'}</p>
          </div>

          {/* Expiration Timer Card */}
          <div className="bg-neutral-950 border border-neutral-800/80 p-6 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Token Expires In
            </span>
            <div className="mt-4 text-5xl font-black font-mono tracking-tight text-white select-none">
              {formatCountdown(secondsRemaining)}
            </div>
            
            <p className="text-[10px] text-neutral-500 mt-3 max-w-[200px]">
              {qr.autoRefresh
                ? 'When countdown hits 00:00, a new secure random token is compiled and rendered.'
                : 'Auto-refresh is OFF. Rotate token manually below.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Details & Actions List */}
          <div className="border-t border-neutral-800 pt-6 space-y-4">
            <div className="flex justify-between text-xs py-1 border-b border-neutral-800/40">
              <span className="text-neutral-400 font-medium">Real Destination URL</span>
              <a
                href={qr.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:underline flex items-center gap-1 font-semibold"
              >
                View Target Url
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            </div>

            <div className="flex justify-between text-xs py-1 border-b border-neutral-800/40">
              <span className="text-neutral-400 font-medium">Cumulative Scans</span>
              <span className="text-white font-bold">{qr.scanCount} scans</span>
            </div>

            <div className="flex justify-between text-xs py-1 border-b border-neutral-800/40">
              <span className="text-neutral-400 font-medium">Rotation Window</span>
              <span className="text-white font-semibold">{qr.expirationSeconds} seconds</span>
            </div>

            <div className="flex justify-between text-xs py-1 border-b border-neutral-800/40">
              <span className="text-neutral-400 font-medium">Max Allowed Scans</span>
              <span className="text-white font-semibold">
                {qr.maxUses !== null ? `${qr.maxUses} uses` : 'Unlimited'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={rotateToken}
              disabled={rotating}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-indigo-600/10 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
              Rotate Token Instantly
            </button>
            
            <button
              onClick={fetchDetails}
              className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm font-semibold transition cursor-pointer"
            >
              Sync Scans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
