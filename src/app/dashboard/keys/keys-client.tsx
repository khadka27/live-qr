'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ShieldCheck, Copy, Check, Info, ArrowRight, Code } from 'lucide-react';

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export function KeysClient() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Creation form states
  const [keyName, setKeyName] = useState('');
  const [expiresDays, setExpiresDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [newKeyDetails, setNewKeyDetails] = useState<{ apiKey: string } | null>(null);
  
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setNewKeyDetails(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName, expiresDays }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewKeyDetails(data);
        setKeyName('');
        fetchKeys();
      } else {
        setError(data.error || 'Failed to generate key');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke API Key "${name}"? Programmatic integrations using it will fail immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/keys?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchKeys();
      } else {
        alert('Failed to revoke key');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (!newKeyDetails) return;
    navigator.clipboard.writeText(newKeyDetails.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">API Keys & Webhooks</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Generate API keys for backend integrations and subscribe to dynamic QR scan events.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Creation Form & Keys list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Key Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Generate REST API Key
            </h3>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs text-neutral-300 font-semibold">Key Name</label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Server Key"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-sm text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-semibold">Expiration Duration</label>
                <select
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(parseInt(e.target.value, 10))}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg py-2 px-3 text-sm outline-none transition"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                  <option value={0}>Never Expires</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm shadow transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Generating...' : 'Create Secret API Key'}
                </button>
              </div>
            </form>

            {/* Secret key presentation block */}
            {newKeyDetails && (
              <div className="mt-4 p-4 bg-emerald-950/20 border border-emerald-800/50 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Key Generated Successfully!</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">
                  Copy this secret key and store it securely. For security, **it will never be displayed again**.
                </p>
                <div className="flex bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800">
                  <input
                    type="text"
                    readOnly
                    value={newKeyDetails.apiKey}
                    className="flex-1 bg-transparent font-mono text-xs text-white px-3 py-2 border-0 outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="bg-neutral-900 border-l border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white px-3 py-2 flex items-center justify-center transition cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Keys List */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              Active REST API Keys
            </h3>

            {loading ? (
              <div className="h-20 bg-neutral-950 border border-neutral-800 rounded animate-pulse" />
            ) : keys.length === 0 ? (
              <p className="text-xs text-neutral-500 font-mono text-center py-6">No API keys generated yet.</p>
            ) : (
              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Prefix</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3">Last Used</th>
                      <th className="px-4 py-3 text-right">Revoke</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-neutral-950/20">
                        <td className="px-4 py-3 font-semibold text-white">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-neutral-500">{k.prefix}_***</td>
                        <td className="px-4 py-3 text-neutral-500">
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevoke(k.id, k.name)}
                            className="p-1 hover:bg-neutral-800 rounded transition text-red-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Developer Docs Quick Reference */}
        <div className="space-y-6">
          {/* API Code Guide */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-400" />
              API Authentication
            </h4>
            <p className="text-neutral-400 text-xs leading-normal">
              Authorize programmatic HTTP requests by adding your key to the `Authorization` header:
            </p>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-[10px] text-neutral-300 leading-normal overflow-x-auto">
              curl -H "Authorization: Bearer lqr_live_your_key" \<br />
              &nbsp;&nbsp;{window.location.origin}/api/qr
            </div>
            <div className="flex items-start gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-[10px] text-neutral-500 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Keep secret keys out of client-side bundles. Use only in secure backend environments.
              </span>
            </div>
          </div>

          {/* Webhooks JSON Schema guide */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Webhook Payload Schema
            </h4>
            <p className="text-neutral-400 text-xs leading-normal">
              Example JSON request payload delivered via POST callback on QR scan events:
            </p>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-[9px] text-neutral-300 leading-normal overflow-x-auto max-h-56">
{`{
  "event": "qr.scan",
  "qrCodeId": "cldh1s...",
  "tokenId": "clj9b1...",
  "timestamp": "2026-07-21T06:40:00Z",
  "country": "US",
  "city": "San Francisco",
  "browser": "Chrome",
  "os": "macOS",
  "deviceType": "desktop",
  "referrer": "https://referrer.com"
}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
