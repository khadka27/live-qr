import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { QRViewerClient } from './qr-viewer-client';
import { UserRole } from '@prisma/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QRViewerPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user;

  // Retrieve QR details, active token, and scan logs count
  const qr = await prisma.qRCode.findUnique({
    where: { id },
    include: {
      tokens: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { scanLogs: true },
      },
    },
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
          You do not have permission to view this QR code.
        </p>
      </div>
    );
  }

  const currentToken = qr.tokens[0];
  const initialData = {
    ...qr,
    logoUrl: qr.logoUrl,
    labelText: qr.labelText,
    description: qr.description,
    webhookUrl: qr.webhookUrl,
    dotType: qr.dotType as any,
    frameType: qr.frameType as any,
    errorCorrection: qr.errorCorrection as any,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
    scanCount: qr._count.scanLogs,
    currentToken: currentToken?.token || null,
    tokenExpiresAt: currentToken?.expiresAt ? currentToken.expiresAt.toISOString() : null,
  };

  return <QRViewerClient initialData={initialData} />;
}
export const dynamic = 'force-dynamic';
