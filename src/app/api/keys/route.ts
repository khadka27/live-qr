import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, logAudit } from '@/lib/auth-helper';

// GET /api/keys - List API Keys
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error('List API keys error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/keys - Create API Key
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, expiresDays } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    // Generate random 24 bytes hex key
    const rawKey = `lqr_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = 'lqr_live';

    let expiresAt: Date | null = null;
    if (expiresDays && typeof expiresDays === 'number' && expiresDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);
    }

    const keyRecord = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        keyHash,
        prefix,
        expiresAt,
      },
    });

    await logAudit(
      user.id,
      'APIKEY_CREATE',
      `Created API Key "${name}"`
    );

    // Return raw key only once
    return NextResponse.json(
      {
        id: keyRecord.id,
        name: keyRecord.name,
        prefix: keyRecord.prefix,
        createdAt: keyRecord.createdAt,
        expiresAt: keyRecord.expiresAt,
        apiKey: rawKey, // Crucial: raw API key returned exactly once
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/keys - Delete/Revoke API Key
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id') || (await request.json().catch(() => ({}))).id;

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: 'API Key ID is required' }, { status: 400 });
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!keyRecord) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }

    // Ownership check
    if (keyRecord.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    await logAudit(
      user.id,
      'APIKEY_REVOKE',
      `Revoked API Key "${keyRecord.name}"`
    );

    return NextResponse.json({ success: true, message: 'API Key revoked successfully' });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
