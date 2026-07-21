'use client';

import React, { useState } from 'react';
import { Shield, Users, BarChart2, RefreshCw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { UserRole } from '@prisma/client';

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
}

interface AdminAuditLog {
  id: string;
  action: string;
  details: string | null;
  timestamp: string;
  user: {
    email: string | null;
    name: string | null;
  } | null;
}

interface TopQR {
  id: string;
  name: string;
  destinationUrl: string;
  scanCount: number;
}

interface AdminClientProps {
  initialUsers: AdminUser[];
  initialAuditLogs: AdminAuditLog[];
  metrics: {
    totalQrs: number;
    totalScans: number;
    activeTokens: number;
    expiredTokens: number;
  };
  topQrs: TopQR[];
}

export function AdminClient({
  initialUsers,
  initialAuditLogs,
  metrics,
  topQrs,
}: AdminClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [searchEmail, setSearchEmail] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: 'success' });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    setStatusMsg({ text: '', type: 'success' });

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, role: data.role } : u))
        );
        setStatusMsg({ text: `Updated user role to ${newRole}`, type: 'success' });
      } else {
        setStatusMsg({ text: data.error || 'Failed to update role', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Error executing role update', type: 'error' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email || '').toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-8 h-8 text-indigo-500" />
          Admin Panel Settings
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Review platform-wide system performance metrics, adjust user access roles, and audit security events.
        </p>
      </div>

      {/* Status Messages */}
      {statusMsg.text && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold border flex items-center gap-2 animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
              : 'bg-red-950/40 border-red-800 text-red-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Global Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Global QRs</span>
          <h3 className="text-3xl font-black text-white mt-1">{metrics.totalQrs}</h3>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Global Redirects</span>
          <h3 className="text-3xl font-black text-white mt-1">{metrics.totalScans}</h3>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Active Tokens</span>
          <h3 className="text-3xl font-black text-indigo-400 mt-1">{metrics.activeTokens}</h3>
        </div>
        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider block">Expired Tokens</span>
          <h3 className="text-3xl font-black text-neutral-400 mt-1">{metrics.expiredTokens}</h3>
        </div>
      </div>

      {/* Top QR codes & Users Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users Management (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              User Access Control
            </h3>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email..."
              className="bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-white outline-none w-48 transition"
            />
          </div>

          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-950/20">
                    <td className="px-4 py-3 font-semibold text-white">{u.name || 'Anonymous'}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        u.role === UserRole.ADMIN
                          ? 'bg-red-950/40 text-red-400 border border-red-900/40'
                          : u.role === UserRole.MANAGER
                          ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/40'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        disabled={updatingUserId === u.id}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-neutral-950 border border-neutral-800 text-white rounded px-2 py-1 text-[11px] outline-none cursor-pointer"
                      >
                        <option value={UserRole.ADMIN}>ADMIN</option>
                        <option value={UserRole.MANAGER}>MANAGER</option>
                        <option value={UserRole.VIEWER}>VIEWER</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing QR Codes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-4">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Top Dynamic QR Codes
          </h3>

          <div className="space-y-3">
            {topQrs.length === 0 ? (
              <p className="text-xs text-neutral-600 font-mono">No scans log recorded.</p>
            ) : (
              topQrs.map((qr, index) => (
                <div key={qr.id} className="flex items-center justify-between py-2 border-b border-neutral-800/40 last:border-b-0 text-xs">
                  <div className="min-w-0">
                    <span className="block font-bold text-white truncate">{index + 1}. {qr.name}</span>
                    <span className="block text-[10px] text-neutral-500 truncate mt-0.5">{qr.destinationUrl}</span>
                  </div>
                  <span className="bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 font-mono font-bold px-2 py-1 rounded shrink-0">
                    {qr.scanCount} scans
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Security Audit Log Trail */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-4">
          <FileText className="w-4 h-4 text-indigo-400" />
          Security Incident & Audit Trail
        </h3>

        <div className="border border-neutral-800/80 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800 sticky top-0">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Audited Action</th>
                <th className="px-4 py-3">User Signature</th>
                <th className="px-4 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {initialAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-neutral-500 font-mono">
                    No security events logged yet.
                  </td>
                </tr>
              ) : (
                initialAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-950/20">
                    <td className="px-4 py-3 text-neutral-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-950/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900/40 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? `${log.user.name || 'Admin'} (${log.user.email})` : 'System Daemon'}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 select-all font-mono leading-relaxed text-[10px]">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
