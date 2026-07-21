import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, checkRole, logAudit } from '@/lib/auth-helper';
import { rotateTokenForQR, invalidateCachedToken } from '@/lib/tokens';
import { UserRole } from '@prisma/client';

const updateQrSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  destinationUrl: z
    .string()
    .url('Invalid URL')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const appParsed = new URL(appUrl);
        if (
          parsed.hostname === appParsed.hostname &&
          parsed.pathname.startsWith('/s/')
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }, 'Open redirect loop to Live QR redirect path is prohibited')
    .optional(),
  expirationSeconds: z.coerce.number().int().min(10).max(86400).optional(),
  autoRefresh: z.boolean().optional(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().max(1048576, 'Logo URL or base64 path is too long').optional(),
  webhookUrl: z.string().url('Invalid Webhook URL').or(z.literal('')).optional(),
  fgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  bgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  dotType: z.enum(['square', 'rounded', 'dots']).optional(),
  frameType: z.enum(['none', 'standard', 'label']).optional(),
  labelText: z.string().max(30).optional(),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional(),
});

// GET /api/qr/:id - Get detailed QR Code details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    // Ownership check (only owner or Admin can view details)
    if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentToken = qr.tokens[0];
    const data = {
      ...qr,
      scanCount: qr._count.scanLogs,
      currentToken: currentToken?.token || null,
      tokenExpiresAt: currentToken?.expiresAt || null,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get QR Details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/qr/:id - Update QR Code
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // Ownership check
    if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateQrSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: result.error.format() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check if configuration updates require active token regeneration
    const requiresRegeneration =
      (data.destinationUrl && data.destinationUrl !== qr.destinationUrl) ||
      (data.expirationSeconds !== undefined &&
        data.expirationSeconds !== qr.expirationSeconds) ||
      (data.maxUses !== undefined && data.maxUses !== qr.maxUses);

    const updatedQr = await prisma.qRCode.update({
      where: { id },
      data: {
        name: data.name,
        destinationUrl: data.destinationUrl,
        expirationSeconds: data.expirationSeconds,
        autoRefresh: data.autoRefresh,
        maxUses: data.maxUses,
        description: data.description,
        logoUrl: data.logoUrl === '' ? null : data.logoUrl ?? undefined,
        fgColor: data.fgColor,
        bgColor: data.bgColor,
        dotType: data.dotType,
        frameType: data.frameType,
        labelText: data.labelText,
        errorCorrection: data.errorCorrection,
        webhookUrl: data.webhookUrl === '' ? null : data.webhookUrl ?? undefined,
      },
    });

    let currentToken = null;
    if (requiresRegeneration) {
      currentToken = await rotateTokenForQR(id);
    } else {
      const activeTokenRecord = await prisma.qRToken.findFirst({
        where: { qrCodeId: id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      currentToken = activeTokenRecord?.token || null;
    }

    await logAudit(
      user.id,
      'QR_UPDATE',
      `Updated QR Code "${updatedQr.name}". Regeneration triggered: ${requiresRegeneration}`
    );

    return NextResponse.json({
      ...updatedQr,
      currentToken,
    });
  } catch (error) {
    console.error('Update QR error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/qr/:id - Delete QR Code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user.role, UserRole.MANAGER)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient privileges' },
      { status: 403 }
    );
  }

  try {
    const qr = await prisma.qRCode.findUnique({
      where: { id },
      include: {
        tokens: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!qr) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    // Ownership check
    if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Clean up cached active tokens from Redis before database cascade delete
    for (const activeToken of qr.tokens) {
      await invalidateCachedToken(activeToken.token);
    }

    // Delete from DB (Prisma cascade onDelete handles tokens and scanLogs)
    await prisma.qRCode.delete({
      where: { id },
    });

    await logAudit(user.id, 'QR_DELETE', `Deleted QR Code "${qr.name}"`);

    return NextResponse.json({ success: true, message: 'QR Code deleted successfully' });
  } catch (error) {
    console.error('Delete QR error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
