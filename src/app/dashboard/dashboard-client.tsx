'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Edit2,
  Trash2,
  BarChart2,
  Eye,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  QrCode as QrIcon
} from 'lucide-react';
import Papa from 'papaparse';
import { generateQRCodeSVG } from '@/lib/qr-generator';

interface QRCode {
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
  updatedAt: string;
  scanCount: number;
  currentToken: string | null;
  tokenExpiresAt: string | null;
}

export function DashboardClient({ userRole }: { userRole: string }) {
  const [qrs, setQrs] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'scanCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<QRCode | null>(null);

  // Form states (Create/Edit)
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formExpiry, setFormExpiry] = useState(60);
  const [formCustomExpiry, setFormCustomExpiry] = useState('');
  const [formAutoRefresh, setFormAutoRefresh] = useState(true);
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebhook, setFormWebhook] = useState('');
  
  // Custom design states
  const [formFgColor, setFormFgColor] = useState('#000000');
  const [formBgColor, setFormBgColor] = useState('#ffffff');
  const [formDotType, setFormDotType] = useState<'square' | 'rounded' | 'dots'>('square');
  const [formFrameType, setFormFrameType] = useState<'none' | 'standard' | 'label'>('none');
  const [formLabelText, setFormLabelText] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formErrorCorrection, setFormErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('Q');

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Countdowns helper state (re-renders every 1 second)
  const [nowTick, setNowTick] = useState(Date.now());
  const [rotatingIds, setRotatingIds] = useState<Record<string, boolean>>({});

  const fetchQRs = async () => {
    try {
      const res = await fetch('/api/qr');
      if (res.ok) {
        const data = await res.json();
        setQrs(data);
      }
    } catch (err) {
      console.error('Error fetching QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRs();
    // Refresh list every 10 seconds to keep scan count and active tokens in sync
    const interval = setInterval(fetchQRs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate tokens on dashboard when countdown reaches 0
  useEffect(() => {
    const now = Date.now();
    qrs.forEach(async (qr) => {
      if (qr.autoRefresh && qr.tokenExpiresAt) {
        const expiresAt = new Date(qr.tokenExpiresAt).getTime();
        // If expired and not already rotating, trigger background rotation
        if (expiresAt <= now && !rotatingIds[qr.id]) {
          setRotatingIds((prev) => ({ ...prev, [qr.id]: true }));
          try {
            const res = await fetch(`/api/qr/${qr.id}/regenerate`, { method: 'POST' });
            if (res.ok) {
              await fetchQRs();
            }
          } catch (err) {
            console.error('Auto-rotation failed for', qr.id, err);
          } finally {
            setRotatingIds((prev) => ({ ...prev, [qr.id]: false }));
          }
        }
      }
    });
  }, [nowTick, qrs, rotatingIds]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setFormError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setFormLogoUrl(data.url);
      } else {
        setFormError(data.error || 'Failed to upload logo image');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred during logo upload.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleOpenEdit = (qr: QRCode) => {
    setSelectedQr(qr);
    setFormName(qr.name);
    setFormUrl(qr.destinationUrl);
    setFormExpiry(qr.expirationSeconds);
    setFormCustomExpiry(String(qr.expirationSeconds));
    setFormAutoRefresh(qr.autoRefresh);
    setFormMaxUses(qr.maxUses ? String(qr.maxUses) : '');
    setFormDescription(qr.description || '');
    setFormWebhook(qr.webhookUrl || '');
    
    setFormFgColor(qr.fgColor);
    setFormBgColor(qr.bgColor);
    setFormDotType(qr.dotType);
    setFormFrameType(qr.frameType);
    setFormLabelText(qr.labelText || '');
    setFormLogoUrl(qr.logoUrl || '');
    setFormErrorCorrection(qr.errorCorrection);
    
    setFormError('');
    setIsEditOpen(true);
  };

  const handleOpenCreate = () => {
    setFormName('');
    setFormUrl('');
    setFormExpiry(60);
    setFormCustomExpiry('');
    setFormAutoRefresh(true);
    setFormMaxUses('');
    setFormDescription('');
    setFormWebhook('');
    
    setFormFgColor('#000000');
    setFormBgColor('#ffffff');
    setFormDotType('square');
    setFormFrameType('none');
    setFormLabelText('');
    setFormLogoUrl('');
    setFormErrorCorrection('Q');
    
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const expirySec = formExpiry === -1 ? parseInt(formCustomExpiry, 10) : formExpiry;
    if (isNaN(expirySec) || expirySec < 10) {
      setFormError('Expiration seconds must be at least 10.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          destinationUrl: formUrl,
          expirationSeconds: expirySec,
          autoRefresh: formAutoRefresh,
          maxUses: formMaxUses ? parseInt(formMaxUses, 10) : null,
          description: formDescription || undefined,
          webhookUrl: formWebhook || undefined,
          fgColor: formFgColor,
          bgColor: formBgColor,
          dotType: formDotType,
          frameType: formFrameType,
          labelText: formLabelText || undefined,
          logoUrl: formLogoUrl || undefined,
          errorCorrection: formErrorCorrection,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create QR code.');
      } else {
        setIsCreateOpen(false);
        fetchQRs();
      }
    } catch (err) {
      console.error(err);
      setFormError('An unexpected error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQr) return;
    setFormError('');
    setFormLoading(true);

    const expirySec = formExpiry === -1 ? parseInt(formCustomExpiry, 10) : formExpiry;
    if (isNaN(expirySec) || expirySec < 10) {
      setFormError('Expiration seconds must be at least 10.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/qr/${selectedQr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          destinationUrl: formUrl,
          expirationSeconds: expirySec,
          autoRefresh: formAutoRefresh,
          maxUses: formMaxUses ? parseInt(formMaxUses, 10) : null,
          description: formDescription || undefined,
          webhookUrl: formWebhook || undefined,
          fgColor: formFgColor,
          bgColor: formBgColor,
          dotType: formDotType,
          frameType: formFrameType,
          labelText: formLabelText || undefined,
          logoUrl: formLogoUrl || undefined,
          errorCorrection: formErrorCorrection,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update QR code.');
      } else {
        setIsEditOpen(false);
        fetchQRs();
      }
    } catch (err) {
      console.error(err);
      setFormError('An unexpected error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete QR Code "${name}"? This deletes all associated history.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/qr/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchQRs();
      } else {
        alert('Failed to delete QR code.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const res = await fetch(`/api/qr/${id}/regenerate`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchQRs();
      } else {
        alert('Rotation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk CSV import handler
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setBulkProgress('Parsing CSV...');
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          setBulkProgress('CSV file is empty');
          return;
        }

        setBulkProgress(`Importing 0 / ${rows.length} rows...`);
        let imported = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const res = await fetch('/api/qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: row.name || `Imported QR ${i + 1}`,
                destinationUrl: row.destinationUrl,
                expirationSeconds: row.expirationSeconds ? parseInt(row.expirationSeconds, 10) : 60,
                maxUses: row.maxUses ? parseInt(row.maxUses, 10) : null,
                description: row.description || undefined,
                webhookUrl: row.webhookUrl || undefined,
                fgColor: row.fgColor || '#000000',
                bgColor: row.bgColor || '#ffffff',
                dotType: row.dotType || 'square',
                frameType: row.frameType || 'none',
                labelText: row.labelText || undefined,
                logoUrl: row.logoUrl || undefined,
              }),
            });

            if (res.ok) {
              imported++;
            } else {
              failed++;
            }
          } catch (err) {
            console.error(err);
            failed++;
          }
          setBulkProgress(`Importing ${i + 1} / ${rows.length} rows (${imported} successful, ${failed} failed)...`);
        }

        setBulkProgress(`Import complete! Created ${imported} QR codes. Failed to create ${failed} rows.`);
        fetchQRs();
        setCsvFile(null);
      },
      error: (err) => {
        setBulkProgress(`CSV parse error: ${err.message}`);
      },
    });
  };

  // Download logic (SVG and PNG formats)
  const handleDownload = (qr: QRCode, format: 'svg' | 'png') => {
    const verificationUrl = `${window.location.origin}/s/${qr.currentToken || 'rotate'}`;
    const result = generateQRCodeSVG(verificationUrl, {
      fgColor: qr.fgColor,
      bgColor: qr.bgColor,
      dotType: qr.dotType,
      frameType: qr.frameType,
      labelText: qr.labelText || undefined,
      logoUrl: qr.logoUrl || undefined,
      errorCorrection: qr.errorCorrection,
    });

    const filename = `${qr.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr`;

    if (format === 'svg') {
      const blob = new Blob([result.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // PNG export
      const svgBlob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Determine resolution sizing (standard 1024x1024 vector scaling)
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = qr.bgColor;
          ctx.fillRect(0, 0, 1024, 1024);
          ctx.drawImage(img, 0, 0, 1024, 1024);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    }
  };

  // Helper to format remaining timer: MM:SS
  const getSecondsRemaining = (expiresAtStr: string | null) => {
    if (!expiresAtStr) return 0;
    const diff = new Date(expiresAtStr).getTime() - nowTick;
    return Math.max(0, Math.floor(diff / 1000));
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtering & Sorting
  const filteredQrs = qrs
    .filter((qr) => qr.name.toLowerCase().includes(search.toLowerCase()) || qr.destinationUrl.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'scanCount') {
        comparison = a.scanCount - b.scanCount;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Headline metrics aggregates
  const totalScansAll = qrs.reduce((acc, curr) => acc + curr.scanCount, 0);
  const activeRotations = qrs.filter((q) => q.autoRefresh).length;

  return (
    <div className="space-y-8">
      {/* Header section with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">QR Codes Dashboard</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Build and manage secure dynamically rotating QR codes that update every minute.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 border border-neutral-800 hover:bg-neutral-800/50 bg-neutral-900/30 px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer text-neutral-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Bulk CSV Upload
          </button>
          
          {userRole !== 'VIEWER' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-indigo-600/10 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create QR Code
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800/80 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-neutral-800">
            <QrIcon className="w-12 h-12 stroke-[1.5]" />
          </div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total QR Codes</span>
          <h3 className="text-3xl font-bold text-white mt-2">{qrs.length}</h3>
          <p className="text-neutral-500 text-xs mt-1">Platform total created</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-neutral-800">
            <BarChart2 className="w-12 h-12 stroke-[1.5]" />
          </div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Redirect Scans</span>
          <h3 className="text-3xl font-bold text-white mt-2">{totalScansAll}</h3>
          <p className="text-neutral-500 text-xs mt-1">GDPR compliant IP hashed scans</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-neutral-800">
            <RefreshCw className="w-12 h-12 stroke-[1.5]" />
          </div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Rotations</span>
          <h3 className="text-3xl font-bold text-indigo-400 mt-2">{activeRotations}</h3>
          <p className="text-neutral-500 text-xs mt-1">Auto-refresh cycles running</p>
        </div>
      </div>

      {/* List Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/30 border border-neutral-800/60 p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by QR name or target URL..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition duration-200"
          />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 text-white rounded px-2 py-1 text-xs outline-none"
            >
              <option value="name">Name</option>
              <option value="createdAt">Created Date</option>
              <option value="scanCount">Scans count</option>
            </select>
          </div>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-white px-2 py-1 rounded text-xs"
          >
            {sortOrder.toUpperCase()}
          </button>
        </div>
      </div>

      {/* QR Codes List Grid/Table */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 bg-neutral-900/50 border border-neutral-800 rounded-lg animate-pulse" />
          <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
          <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
          <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg animate-pulse" />
        </div>
      ) : filteredQrs.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-neutral-800/80 bg-neutral-900/20 rounded-2xl py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 mb-4">
            <QrIcon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-white">No QR codes found</h3>
          <p className="text-neutral-400 text-sm mt-1 max-w-sm">
            {search ? 'No results match your search parameters.' : 'Get started by creating your first secure dynamic rotating QR code.'}
          </p>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-900 text-neutral-400 text-xs font-semibold uppercase border-b border-neutral-800">
                <th className="px-6 py-4">QR Name</th>
                <th className="px-6 py-4">Destination URL</th>
                <th className="px-6 py-4">Current Token</th>
                <th className="px-6 py-4 text-center">Countdown</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Scans</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-sm">
              {filteredQrs.map((qr) => {
                const secondsRemaining = getSecondsRemaining(qr.tokenExpiresAt);
                const hasExpired = secondsRemaining === 0;

                return (
                  <tr key={qr.id} className="hover:bg-neutral-900/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      <Link href={`/dashboard/qr/${qr.id}`} className="hover:underline flex items-center gap-2">
                        {qr.name}
                        <Eye className="w-3.5 h-3.5 text-neutral-500 inline" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-neutral-400 max-w-[200px] truncate">
                      <a
                        href={qr.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline hover:text-white flex items-center gap-1.5"
                      >
                        {qr.destinationUrl}
                        <ExternalLink className="w-3 h-3 text-neutral-600 inline shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500 select-all max-w-[120px] truncate">
                      {qr.currentToken ? (
                        <span className="bg-neutral-800/80 px-2 py-1 rounded text-neutral-300 border border-neutral-700/50">
                          {qr.currentToken.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-red-500">No token</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {qr.autoRefresh ? (
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            secondsRemaining < 15
                              ? 'text-red-400 bg-red-950/20 border border-red-900/50 animate-pulse'
                              : 'text-indigo-400 bg-indigo-950/20 border border-indigo-900/50'
                          }`}
                        >
                          {formatCountdown(secondsRemaining)}
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {hasExpired && qr.autoRefresh ? (
                        <span className="inline-flex items-center gap-1 rounded bg-yellow-950/40 px-2 py-0.5 text-xs font-semibold text-yellow-500 border border-yellow-800/40">
                          Rotating
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-800/40">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-white">
                      {qr.scanCount}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      <Link href={`/dashboard/qr/${qr.id}`}>
                        <button
                          title="View Dynamic QR code"
                          className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-indigo-400" />
                        </button>
                      </Link>
                      {userRole !== 'VIEWER' && (
                        <button
                          onClick={() => handleRegenerate(qr.id)}
                          title="Rotate Token Instantly"
                          className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <Link href={`/dashboard/analytics/${qr.id}`}>
                        <button
                          title="Analytics Dashboard"
                          className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                        >
                          <BarChart2 className="w-4 h-4 text-indigo-400" />
                        </button>
                      </Link>
                      
                      {/* Download split actions */}
                      <button
                        onClick={() => handleDownload(qr, 'svg')}
                        title="Download Vector SVG"
                        className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => handleDownload(qr, 'png')}
                        title="Download Raster PNG"
                        className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer text-xs font-bold font-mono px-1 hover:text-indigo-300"
                      >
                        PNG
                      </button>

                      {userRole !== 'VIEWER' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(qr)}
                            title="Edit Configurations"
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 text-neutral-300" />
                          </button>
                          <button
                            onClick={() => handleDelete(qr.id, qr.name)}
                            title="Delete Permanently"
                            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE QR CODE */}
      {/* ==================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto my-8">
            <h2 className="text-xl font-bold text-white mb-6">Create Secure QR Code</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Basic configuration group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">QR Code Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. WiFi Key Card, VIP Checkin"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Destination Target URL</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://yoursecurepage.com/secret"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Rotation Window</label>
                  <select
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(parseInt(e.target.value, 10))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  >
                    <option value={30}>30 Seconds</option>
                    <option value={60}>60 Seconds (1 Min)</option>
                    <option value={300}>5 Minutes</option>
                    <option value={600}>10 Minutes</option>
                    <option value={1800}>30 Minutes</option>
                    <option value={3600}>1 Hour</option>
                    <option value={-1}>Custom seconds...</option>
                  </select>
                </div>
                
                {formExpiry === -1 && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-semibold text-neutral-300">Custom Duration (Secs)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={formCustomExpiry}
                      onChange={(e) => setFormCustomExpiry(e.target.value)}
                      placeholder="e.g. 120"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Scan Limit (Max Uses)</label>
                  <input
                    type="number"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    Rotation Mode
                  </label>
                  <div className="flex items-center gap-4 h-9">
                    <label className="inline-flex items-center text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formAutoRefresh}
                        onChange={(e) => setFormAutoRefresh(e.target.checked)}
                        className="rounded border-neutral-800 text-indigo-600 bg-neutral-950 h-4 w-4 mr-2"
                      />
                      Auto-Refresh ON
                    </label>
                  </div>
                </div>
              </div>

              {/* Collapsible Design Styles Accordion */}
              <div className="border border-neutral-800 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Custom QR Code Styling Options
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Dots Styling Shape</label>
                    <select
                      value={formDotType}
                      onChange={(e) => setFormDotType(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="square">Classic Square</option>
                      <option value="rounded">Rounded Squares</option>
                      <option value="dots">Modern Circular Dots</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Frame Layout</label>
                    <select
                      value={formFrameType}
                      onChange={(e) => setFormFrameType(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="none">No Frame</option>
                      <option value="standard">Standard Box Frame</option>
                      <option value="label">Instructional Text Frame</option>
                    </select>
                  </div>
                </div>

                {formFrameType === 'label' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-semibold text-neutral-300">Label Text</label>
                    <input
                      type="text"
                      value={formLabelText}
                      onChange={(e) => setFormLabelText(e.target.value)}
                      placeholder="e.g. SCAN ME TO VERIFY"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Foreground Color (Dots)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formFgColor}
                        onChange={(e) => setFormFgColor(e.target.value)}
                        className="bg-transparent border border-neutral-800 h-9 w-12 rounded cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formFgColor}
                        onChange={(e) => setFormFgColor(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg py-1.5 px-3 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Background Color (Backing)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formBgColor}
                        onChange={(e) => setFormBgColor(e.target.value)}
                        className="bg-transparent border border-neutral-800 h-9 w-12 rounded cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formBgColor}
                        onChange={(e) => setFormBgColor(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg py-1.5 px-3 text-sm text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      Logo Overlay URL / File
                      <span title="Embeds logo/image inside the center of the QR code matrix.">
                        <HelpCircle className="w-3.5 h-3.5 text-neutral-500 cursor-help" />
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        placeholder="https://domain.com/logo.png or upload..."
                        className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="logo-file-create"
                        onChange={handleLogoUpload}
                      />
                      <label
                        htmlFor="logo-file-create"
                        className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center shrink-0 cursor-pointer border border-neutral-700 select-none"
                      >
                        {uploadingLogo ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Error Correction Level</label>
                    <select
                      value={formErrorCorrection}
                      onChange={(e) => setFormErrorCorrection(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="L">L (7% Recovery)</option>
                      <option value="M">M (15% Recovery)</option>
                      <option value="Q">Q (25% Recovery)</option>
                      <option value="H">H (30% Recovery - Recommended for Logos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description & Webhook Group */}
              <div className="space-y-4 border-t border-neutral-800 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Webhook HTTP Callback URL (Optional)</label>
                  <input
                    type="url"
                    value={formWebhook}
                    onChange={(e) => setFormWebhook(e.target.value)}
                    placeholder="https://yourserver.com/webhooks/qr-scan"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                  <p className="text-[10px] text-neutral-500 leading-tight">
                    Fires a JSON POST request containing geolocation details, device analytics, and timestamps on scan event.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Internal reference details..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/10 transition cursor-pointer disabled:opacity-55"
                >
                  {formLoading ? 'Creating...' : 'Create QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT QR CODE */}
      {/* ==================================================== */}
      {isEditOpen && selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto my-8">
            <h2 className="text-xl font-bold text-white mb-2">Edit: {selectedQr.name}</h2>
            <p className="text-neutral-500 text-xs mb-6">
              Note: Changing destination url, expiration settings, or max scans will immediately trigger a new token rotation cache build.
            </p>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">QR Code Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Destination Target URL</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Rotation Window</label>
                  <select
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(parseInt(e.target.value, 10))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  >
                    <option value={30}>30 Seconds</option>
                    <option value={60}>60 Seconds (1 Min)</option>
                    <option value={300}>5 Minutes</option>
                    <option value={600}>10 Minutes</option>
                    <option value={1800}>30 Minutes</option>
                    <option value={3600}>1 Hour</option>
                    <option value={-1}>Custom seconds...</option>
                  </select>
                </div>
                
                {formExpiry === -1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Custom Duration (Secs)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={formCustomExpiry}
                      onChange={(e) => setFormCustomExpiry(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Scan Limit (Max Uses)</label>
                  <input
                    type="number"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Rotation Mode</label>
                  <div className="flex items-center gap-4 h-9">
                    <label className="inline-flex items-center text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formAutoRefresh}
                        onChange={(e) => setFormAutoRefresh(e.target.checked)}
                        className="rounded border-neutral-800 text-indigo-600 bg-neutral-950 h-4 w-4 mr-2"
                      />
                      Auto-Refresh ON
                    </label>
                  </div>
                </div>
              </div>

              {/* Design options block */}
              <div className="border border-neutral-800 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Custom QR Code Styling Options
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Dots Styling Shape</label>
                    <select
                      value={formDotType}
                      onChange={(e) => setFormDotType(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="square">Classic Square</option>
                      <option value="rounded">Rounded Squares</option>
                      <option value="dots">Modern Circular Dots</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Frame Layout</label>
                    <select
                      value={formFrameType}
                      onChange={(e) => setFormFrameType(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="none">No Frame</option>
                      <option value="standard">Standard Box Frame</option>
                      <option value="label">Instructional Text Frame</option>
                    </select>
                  </div>
                </div>

                {formFrameType === 'label' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Label Text</label>
                    <input
                      type="text"
                      value={formLabelText}
                      onChange={(e) => setFormLabelText(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Foreground Color (Dots)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formFgColor}
                        onChange={(e) => setFormFgColor(e.target.value)}
                        className="bg-transparent border border-neutral-800 h-9 w-12 rounded cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formFgColor}
                        onChange={(e) => setFormFgColor(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg py-1.5 px-3 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Background Color (Backing)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formBgColor}
                        onChange={(e) => setFormBgColor(e.target.value)}
                        className="bg-transparent border border-neutral-800 h-9 w-12 rounded cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formBgColor}
                        onChange={(e) => setFormBgColor(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg py-1.5 px-3 text-sm text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Logo Overlay URL / File</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        placeholder="https://domain.com/logo.png or upload..."
                        className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="logo-file-edit"
                        onChange={handleLogoUpload}
                      />
                      <label
                        htmlFor="logo-file-edit"
                        className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center shrink-0 cursor-pointer border border-neutral-700 select-none"
                      >
                        {uploadingLogo ? 'Uploading...' : 'Upload File'}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Error Correction Level</label>
                    <select
                      value={formErrorCorrection}
                      onChange={(e) => setFormErrorCorrection(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                    >
                      <option value="L">L (7% Recovery)</option>
                      <option value="M">M (15% Recovery)</option>
                      <option value="Q">Q (25% Recovery)</option>
                      <option value="H">H (30% Recovery - Recommended for Logos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Webhooks & Description */}
              <div className="space-y-4 border-t border-neutral-800 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Webhook HTTP Callback URL (Optional)</label>
                  <input
                    type="url"
                    value={formWebhook}
                    onChange={(e) => setFormWebhook(e.target.value)}
                    placeholder="https://yourserver.com/webhooks/qr-scan"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/10 transition cursor-pointer disabled:opacity-55"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: BULK CSV UPLOAD */}
      {/* ==================================================== */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Bulk QR Code Import via CSV
            </h2>
            <p className="text-xs text-neutral-400 mb-6">
              Upload a comma-separated values (CSV) file containing your target redirection URLs and metadata configuration details.
            </p>

            {bulkProgress && (
              <div className="mb-6 p-4 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-normal">
                <span className="block font-semibold text-indigo-400">Import Progress Status:</span>
                <span className="block text-neutral-300 font-mono mt-1 whitespace-pre-wrap">{bulkProgress}</span>
              </div>
            )}

            <form onSubmit={handleBulkUpload} className="space-y-6">
              <div className="space-y-2 border border-dashed border-neutral-800 rounded-xl p-6 text-center bg-neutral-950/20">
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mx-auto block text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500 mt-2">
                  Accepted file format: <strong>.csv</strong> only. Max file size: 10MB.
                </p>
              </div>

              {/* Sample format hint */}
              <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg text-[10px] text-neutral-400 leading-normal">
                <span className="block font-bold text-white mb-1.5">Required CSV Headers Template Structure:</span>
                <code className="block font-mono text-neutral-300 overflow-x-auto bg-neutral-900/50 p-2 rounded">
                  name,destinationUrl,expirationSeconds,maxUses,description,webhookUrl
                </code>
                <span className="block mt-2">
                  Example row:<br />
                  <code className="font-mono text-neutral-300">
                    "WiFi Signage","https://mysite.com",60,10,"Internal Wi-Fi Redirect",""
                  </code>
                </span>
              </div>

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkOpen(false);
                    setBulkProgress('');
                  }}
                  className="px-4 py-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/10 transition cursor-pointer"
                >
                  Start Import Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
