import crypto from 'crypto';
import { prisma } from './prisma';
import { redis } from './redis';

export interface CachedTokenData {
  qrCodeId: string;
  destinationUrl: string;
  expiresAt: string;
  maxUses: number | null;
  scanCount: number;
  webhookUrl: string | null;
}

// Generate cryptographically secure 32-byte token represented as base64url
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Save token in cache
export async function cacheToken(
  token: string,
  data: CachedTokenData,
  ttlSeconds: number
): Promise<void> {
  const key = `token:${token}`;
  if (ttlSeconds <= 0) return;
  
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}

// Remove token from cache
export async function invalidateCachedToken(token: string): Promise<void> {
  await redis.del(`token:${token}`);
}

// Rotate token for a given QR code
export async function rotateTokenForQR(qrCodeId: string): Promise<string> {
  // 1. Fetch QR Details
  const qr = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
  });

  if (!qr) {
    throw new Error(`QR Code with ID ${qrCodeId} not found`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + qr.expirationSeconds * 1000);

  // 2. Revoke or Expire previous active tokens in DB
  const activeTokens = await prisma.qRToken.findMany({
    where: {
      qrCodeId,
      status: 'ACTIVE',
    },
  });

  // Invalidate previous tokens in cache
  for (const t of activeTokens) {
    await invalidateCachedToken(t.token);
  }

  // Update status in DB
  await prisma.qRToken.updateMany({
    where: {
      qrCodeId,
      status: 'ACTIVE',
    },
    data: {
      status: 'EXPIRED',
    },
  });

  // 3. Generate new secure token
  const token = generateSecureToken();

  // 4. Save to Database
  const qrToken = await prisma.qRToken.create({
    data: {
      qrCodeId,
      token,
      expiresAt,
      maxUses: qr.maxUses,
      status: 'ACTIVE',
    },
  });

  // 5. Save to Redis Cache
  const cacheData: CachedTokenData = {
    qrCodeId: qr.id,
    destinationUrl: qr.destinationUrl,
    expiresAt: expiresAt.toISOString(),
    maxUses: qr.maxUses,
    scanCount: 0,
    webhookUrl: qr.webhookUrl,
  };

  // Give caching a 5-second grace period beyond expiration
  await cacheToken(token, cacheData, qr.expirationSeconds + 5);

  return token;
}

// Validate a secure token and update uses/logs
export async function validateToken(
  token: string
): Promise<{
  valid: boolean;
  destinationUrl?: string;
  qrCodeId?: string;
  tokenId?: string;
  reason?: string;
  webhookUrl?: string;
}> {
  const cacheKey = `token:${token}`;
  let tokenData: CachedTokenData | null = null;

  // 1. Read from Redis Cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      tokenData = JSON.parse(cached);
    }
  } catch (err) {
    console.error('Redis read error:', err);
  }

  let dbToken = null;

  // 2. Fallback to Database if cache miss
  if (!tokenData) {
    dbToken = await prisma.qRToken.findFirst({
      where: { token },
      include: { qrCode: true },
    });

    if (!dbToken) {
      return { valid: false, reason: 'INVALID_TOKEN' };
    }

    if (dbToken.status !== 'ACTIVE') {
      return { valid: false, reason: 'REVOKED_OR_EXPIRED' };
    }

    const now = new Date();
    if (dbToken.expiresAt < now) {
      // Update status in DB
      await prisma.qRToken.update({
        where: { id: dbToken.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    if (dbToken.maxUses !== null && dbToken.scanCount >= dbToken.maxUses) {
      await prisma.qRToken.update({
        where: { id: dbToken.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, reason: 'MAX_USES_EXCEEDED' };
    }

    tokenData = {
      qrCodeId: dbToken.qrCodeId,
      destinationUrl: dbToken.qrCode.destinationUrl,
      expiresAt: dbToken.expiresAt.toISOString(),
      maxUses: dbToken.maxUses,
      scanCount: dbToken.scanCount,
      webhookUrl: dbToken.qrCode.webhookUrl,
    };

    // Recache it
    const ttl = Math.max(
      0,
      Math.floor((dbToken.expiresAt.getTime() - now.getTime()) / 1000)
    );
    await cacheToken(token, tokenData, ttl + 5);
  }

  // 3. Double-check expiration
  const now = new Date();
  const expiresAt = new Date(tokenData.expiresAt);
  if (expiresAt < now) {
    await invalidateCachedToken(token);
    await prisma.qRToken.update({
      where: { token },
      data: { status: 'EXPIRED' },
    });
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  // 4. Double-check max uses
  if (tokenData.maxUses !== null && tokenData.scanCount >= tokenData.maxUses) {
    await invalidateCachedToken(token);
    await prisma.qRToken.update({
      where: { token },
      data: { status: 'EXPIRED' },
    });
    return { valid: false, reason: 'MAX_USES_EXCEEDED' };
  }

  // 5. Retrieve or fetch token ID from database (for ScanLog linkage)
  if (!dbToken) {
    dbToken = await prisma.qRToken.findFirst({
      where: { token },
    });
  }

  if (!dbToken) {
    return { valid: false, reason: 'INVALID_TOKEN' };
  }

  // 6. Update counts (DB and Cache)
  const newScanCount = tokenData.scanCount + 1;
  
  // Update Cache
  tokenData.scanCount = newScanCount;
  const remainingTtl = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  );
  await cacheToken(token, tokenData, remainingTtl + 5);

  // Update DB (QRToken scanCount + QRCode scan count)
  await prisma.qRToken.update({
    where: { id: dbToken.id },
    data: {
      scanCount: { increment: 1 },
      status:
        tokenData.maxUses !== null && newScanCount >= tokenData.maxUses
          ? 'EXPIRED'
          : 'ACTIVE',
    },
  });

  // If scan limit reached, invalidate cache
  if (tokenData.maxUses !== null && newScanCount >= tokenData.maxUses) {
    await invalidateCachedToken(token);
  }

  return {
    valid: true,
    destinationUrl: tokenData.destinationUrl,
    qrCodeId: tokenData.qrCodeId,
    tokenId: dbToken.id,
    webhookUrl: tokenData.webhookUrl || undefined,
  };
}
