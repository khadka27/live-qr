import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminClient } from './admin-client';
import { UserRole } from '@prisma/client';

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user;

  // Authorization role check (ADMIN only)
  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <h2 className="text-xl font-bold text-red-500">Access Denied</h2>
        <p className="text-neutral-400 text-sm mt-2 font-semibold">
          ADMIN privileges are required to access this dashboard.
        </p>
      </div>
    );
  }

  // 1. Fetch Users
  const rawUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const users = rawUsers.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  // 2. Fetch Audit Logs
  const rawAuditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const auditLogs = rawAuditLogs.map((log) => ({
    ...log,
    timestamp: log.timestamp.toISOString(),
  }));

  // 3. Aggregate Platform-wide Metrics
  const totalQrs = await prisma.qRCode.count();
  const totalScans = await prisma.scanLog.count();
  const activeTokens = await prisma.qRToken.count({
    where: { status: 'ACTIVE' },
  });
  const expiredTokens = await prisma.qRToken.count({
    where: { status: 'EXPIRED' },
  });

  // 4. Fetch Top Performing QR Codes
  const rawTopQrs = await prisma.qRCode.findMany({
    select: {
      id: true,
      name: true,
      destinationUrl: true,
      _count: {
        select: { scanLogs: true },
      },
    },
    orderBy: {
      scanLogs: {
        _count: 'desc',
      },
    },
    take: 5,
  });

  const topQrs = rawTopQrs.map((qr) => ({
    id: qr.id,
    name: qr.name,
    destinationUrl: qr.destinationUrl,
    scanCount: qr._count.scanLogs,
  }));

  return (
    <AdminClient
      initialUsers={users}
      initialAuditLogs={auditLogs}
      metrics={{ totalQrs, totalScans, activeTokens, expiredTokens }}
      topQrs={topQrs}
    />
  );
}
export const dynamic = 'force-dynamic';
