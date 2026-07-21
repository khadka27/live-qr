import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, checkRole, logAudit } from '@/lib/auth-helper';
import { rotateTokenForQR } from '@/lib/tokens';
import { UserRole } from '@prisma/client';

const createQrSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  destinationUrl: z
    .string()
    .url('Invalid URL')
    .refine((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

        // Prevent infinite loops to our verification endpoint
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
    }, 'Open redirect loop to Live QR redirect path is prohibited'),
  expirationSeconds: z.coerce.number().int().min(10).max(86400).default(60),
  autoRefresh: z.boolean().default(true),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().max(1048576, 'Logo URL or base64 path is too long').optional(),
  webhookUrl: z.string().url('Invalid Webhook URL').or(z.literal('')).optional(),
  fgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .default('#000000'),
  bgColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .default('#ffffff'),
  dotType: z.enum(['square', 'rounded', 'dots']).default('square'),
  frameType: z.enum(['none', 'standard', 'label']).default('none'),
  labelText: z.string().max(30).optional(),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('Q'),
});

// GET /api/qr - List QR codes
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const qrs = await prisma.qRCode.findMany({
      where: user.role === UserRole.ADMIN ? {} : { userId: user.id },
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
      orderBy: { createdAt: 'desc' },
    });

    const formattedQrs = qrs.map((qr) => ({
      id: qr.id,
      name: qr.name,
      destinationUrl: qr.destinationUrl,
      expirationSeconds: qr.expirationSeconds,
      autoRefresh: qr.autoRefresh,
      maxUses: qr.maxUses,
      description: qr.description,
      logoUrl: qr.logoUrl,
      fgColor: qr.fgColor,
      bgColor: qr.bgColor,
      dotType: qr.dotType,
      frameType: qr.frameType,
      labelText: qr.labelText,
      errorCorrection: qr.errorCorrection,
      userId: qr.userId,
      createdAt: qr.createdAt,
      updatedAt: qr.updatedAt,
      scanCount: qr._count.scanLogs,
      currentToken: qr.tokens[0]?.token || null,
      tokenExpiresAt: qr.tokens[0]?.expiresAt || null,
    }));

    return NextResponse.json(formattedQrs);
  } catch (error) {
    console.error('List QRs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/qr - Create QR code
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create permission: Must be MANAGER or ADMIN
  if (!checkRole(user.role, UserRole.MANAGER)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient privileges' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const result = createQrSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: result.error.format() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Create the QR Code record
    const qr = await prisma.qRCode.create({
      data: {
        name: data.name,
        destinationUrl: data.destinationUrl,
        expirationSeconds: data.expirationSeconds,
        autoRefresh: data.autoRefresh,
        maxUses: data.maxUses,
        description: data.description,
        logoUrl: data.logoUrl || null,
        fgColor: data.fgColor,
        bgColor: data.bgColor,
        dotType: data.dotType,
        frameType: data.frameType,
        labelText: data.labelText || null,
        errorCorrection: data.errorCorrection,
        webhookUrl: data.webhookUrl || null,
        userId: user.id,
      },
    });

    // Spin up the initial secure token
    const token = await rotateTokenForQR(qr.id);

    await logAudit(
      user.id,
      'QR_CREATE',
      `Created QR Code "${qr.name}" pointing to ${qr.destinationUrl}`
    );

    return NextResponse.json(
      {
        ...qr,
        currentToken: token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create QR error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
