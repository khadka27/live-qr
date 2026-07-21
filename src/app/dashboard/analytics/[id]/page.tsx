import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AnalyticsClient } from './analytics-client';
import { UserRole } from '@prisma/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QRAnalyticsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user;

  // Retrieve QR details to verify ownership/rights before rendering client SWR
  const qr = await prisma.qRCode.findUnique({
    where: { id },
  });

  if (!qr) {
    notFound();
  }

  // Access validation: owner or admin role
  if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <h2 className="text-xl font-bold text-red-500">Access Denied</h2>
        <p className="text-neutral-400 text-sm mt-2">
          You do not have permission to view analytics for this QR code.
        </p>
      </div>
    );
  }

  return <AnalyticsClient qrId={id} />;
}
export const dynamic = 'force-dynamic';
