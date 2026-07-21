'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, BarChart2, Globe, Laptop, Smartphone, Compass } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface AnalyticsData {
  qrName: string;
  destinationUrl: string;
  totalScans: number;
  uniqueScans: number;
  browsers: { name: string; count: number }[];
  osList: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
  timeline: { date: string; scans: number }[];
  recentScans: {
    id: string;
    country: string | null;
    city: string | null;
    browser: string | null;
    os: string | null;
    deviceType: string | null;
    referrer: string | null;
    timestamp: string;
  }[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#eab308', '#10b981', '#06b6d4', '#3b82f6'];

export function AnalyticsClient({ qrId }: { qrId: string }) {
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/${qrId}?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, qrId]);

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-neutral-900 border border-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
          <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
          <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
          <div className="h-24 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-80 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-12">
        <p className="text-red-500 font-semibold">Error loading analytics dataset.</p>
        <Link href="/dashboard" className="text-indigo-400 hover:underline text-sm mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-500" />
            Analytics: {data.qrName}
          </h1>
          <p className="text-neutral-500 text-xs mt-1 truncate max-w-md">
            Destination: <span className="font-mono text-neutral-400">{data.destinationUrl}</span>
          </p>
        </div>

        {/* Time Selector */}
        <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-lg shrink-0">
          {(['today', '7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs font-semibold px-3 py-1.5 rounded transition ${
                range === r ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Numerical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Total Scans</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{data.totalScans}</h3>
          <p className="text-[10px] text-neutral-600 mt-1">Total redirects executed</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Unique Scans</span>
          <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{data.uniqueScans}</h3>
          <p className="text-[10px] text-neutral-600 mt-1">Filtered by distinct IP Hash</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Scans Ratio</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {data.totalScans > 0 ? ((data.uniqueScans / data.totalScans) * 100).toFixed(1) : 0}%
          </h3>
          <p className="text-[10px] text-neutral-600 mt-1">Unique scans over total</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 p-5 rounded-xl">
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Daily Average</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">
            {data.timeline.length > 0 ? (data.totalScans / data.timeline.length).toFixed(1) : 0}
          </h3>
          <p className="text-[10px] text-neutral-600 mt-1">Average redirects per date</p>
        </div>
      </div>

      {/* Main Timeline Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Scans Over Time (Timeline Timeline)
        </h3>
        <div className="h-80 w-full">
          {data.timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 text-xs font-mono">
              No historical data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#525252" fontSize={11} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="scans" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScans)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Devices Donut Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Laptop className="w-4 h-4 text-indigo-400" />
            Device Distribution
          </h4>
          <div className="h-48 flex-1 relative flex items-center justify-center">
            {data.devices.length === 0 ? (
              <span className="text-xs text-neutral-500">No device logs</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.devices}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {data.devices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs justify-center">
            {data.devices.map((d, index) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-neutral-400 capitalize">{d.name}:</span>
                <span className="text-white font-bold">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browsers Bar Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            Top Browsers
          </h4>
          <div className="h-48 flex-1">
            {data.browsers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">No browser logs</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.browsers.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={10} tickLine={false} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={12}>
                    {data.browsers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Operating Systems Bar Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col shadow-xl">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            Operating Systems
          </h4>
          <div className="h-48 flex-1">
            {data.osList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">No OS logs</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.osList.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={10} tickLine={false} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c084fc" radius={[0, 4, 4, 0]} barSize={12}>
                    {data.osList.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation, Referrer splits & Audit logs table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Geo Split table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Top Demographics (Countries & Cities)
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {/* Countries */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Countries</span>
              {data.countries.length === 0 ? (
                <span className="text-xs text-neutral-600 font-mono">No logs</span>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {data.countries.map((c) => (
                    <div key={c.name} className="flex justify-between text-xs py-1.5 border-b border-neutral-800/40">
                      <span className="text-neutral-400 font-semibold">{c.name}</span>
                      <span className="text-white font-bold">{c.count} scans</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Cities */}
            <div className="space-y-2">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Cities</span>
              {data.cities.length === 0 ? (
                <span className="text-xs text-neutral-600 font-mono">No logs</span>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {data.cities.map((c) => (
                    <div key={c.name} className="flex justify-between text-xs py-1.5 border-b border-neutral-800/40">
                      <span className="text-neutral-400 font-semibold">{c.name}</span>
                      <span className="text-white font-bold">{c.count} scans</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referrers & Activity Log */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            Top Traffic Referrers
          </h4>
          {data.referrers.length === 0 ? (
            <p className="text-xs text-neutral-600 font-mono">No referrer logs recorded.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {data.referrers.map((r) => (
                <div key={r.name} className="flex justify-between text-xs py-1.5 border-b border-neutral-800/40">
                  <span className="text-neutral-400 font-semibold truncate max-w-[200px]">{r.name}</span>
                  <span className="text-white font-bold">{r.count} scans</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent scans list table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-white">Recent Redirection Logs (GDPR Compliant IP Hash)</h4>
        <div className="border border-neutral-800/80 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950 text-neutral-400 font-bold border-b border-neutral-800">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Browser</th>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Device Type</th>
                <th className="px-4 py-3">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {data.recentScans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-neutral-500 font-mono">
                    No scans logs in database.
                  </td>
                </tr>
              ) : (
                data.recentScans.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-900/20">
                    <td className="px-4 py-3 text-neutral-500 font-mono">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">{s.country || 'Unknown'}</td>
                    <td className="px-4 py-3">{s.city || 'Unknown'}</td>
                    <td className="px-4 py-3 text-indigo-400">{s.browser || 'Unknown'}</td>
                    <td className="px-4 py-3">{s.os || 'Unknown'}</td>
                    <td className="px-4 py-3 font-medium capitalize">{s.deviceType || 'desktop'}</td>
                    <td className="px-4 py-3 text-neutral-400 truncate max-w-[150px]">{s.referrer || 'Direct'}</td>
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
