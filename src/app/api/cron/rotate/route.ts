import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rotateTokenForQR, invalidateCachedToken } from '@/lib/tokens';

// GET or POST /api/cron/rotate - Automated token rotation cron
export async function GET(request: NextRequest) {
  return handleRotate(request);
}

export async function POST(request: NextRequest) {
  return handleRotate(request);
}

async function handleRotate(request: NextRequest) {
  // 1. Authorize trigger via Bearer token
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET || 'liveqr_rotation_cron_secret_77281_xyz';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // 2. Fetch all active tokens that have expired
    const expiredActiveTokens = await prisma.qRToken.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      include: {
        qrCode: true,
      },
    });

    const results = {
      totalExpired: expiredActiveTokens.length,
      rotated: 0,
      expiredOnly: 0,
      errors: 0,
    };

    // 3. Process each expired token
    for (const tokenRecord of expiredActiveTokens) {
      try {
        if (tokenRecord.qrCode.autoRefresh) {
          // If autoRefresh is enabled, rotate to a new token
          await rotateTokenForQR(tokenRecord.qrCodeId);
          results.rotated++;
        } else {
          // If autoRefresh is OFF, just mark as EXPIRED and remove from cache
          await invalidateCachedToken(tokenRecord.token);
          await prisma.qRToken.update({
            where: { id: tokenRecord.id },
            data: { status: 'EXPIRED' },
          });
          results.expiredOnly++;
        }
      } catch (err) {
        console.error(`Error rotating token ${tokenRecord.id}:`, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredActiveTokens.length} expired tokens.`,
      ...results,
    });
  } catch (error) {
    console.error('Cron token rotation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
