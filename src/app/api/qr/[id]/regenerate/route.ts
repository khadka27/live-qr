import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, checkRole, logAudit } from '@/lib/auth-helper';
import { rotateTokenForQR } from '@/lib/tokens';
import { UserRole } from '@prisma/client';

// POST /api/qr/:id/regenerate - Generate a new token immediately
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Manager or Admin permissions required
  if (!checkRole(user.role, UserRole.MANAGER)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient privileges' },
      { status: 403 }
    );
  }

  try {
    const qr = await prisma.qRCode.findUnique({
      where: { id },
    });

    if (!qr) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    // Check ownership
    if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rotate token immediately
    const token = await rotateTokenForQR(id);

    // Get expiration date
    const tokenRecord = await prisma.qRToken.findUnique({
      where: { token },
    });

    await logAudit(
      user.id,
      'QR_REGENERATE',
      `Manually regenerated token for QR Code "${qr.name}"`
    );

    return NextResponse.json({
      success: true,
      token,
      expiresAt: tokenRecord?.expiresAt || null,
    });
  } catch (error) {
    console.error('Regenerate QR token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
