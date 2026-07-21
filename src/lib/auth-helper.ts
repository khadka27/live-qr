import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  authMethod: 'session' | 'apikey';
}

// Check role hierarchies
export function checkRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roles = [UserRole.VIEWER, UserRole.MANAGER, UserRole.ADMIN];
  const userIdx = roles.indexOf(userRole);
  const reqIdx = roles.indexOf(requiredRole);
  return userIdx >= reqIdx;
}

// Authenticate a request via NextAuth session or API Key
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  // 1. Try API Key Auth first
  const apiKeyHeader =
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    request.headers.get('x-api-key');

  if (apiKeyHeader) {
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');

    try {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (keyRecord) {
        // Check expiration
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
          return null;
        }

        // Update last used timestamp asynchronously
        prisma.apiKey
          .update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() },
          })
          .catch((e) => console.error('Error updating api key lastUsedAt:', e));

        return {
          id: keyRecord.user.id,
          name: keyRecord.user.name,
          email: keyRecord.user.email,
          role: keyRecord.user.role,
          authMethod: 'apikey',
        };
      }
    } catch (err) {
      console.error('API key auth error:', err);
    }
  }

  // 2. Try Session Auth (NextAuth)
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        role: session.user.role,
        authMethod: 'session',
      };
    }
  } catch (err) {
    console.error('Session auth error:', err);
  }

  return null;
}

// Helper to log user activities (Audit Logging)
export async function logAudit(
  userId: string | null,
  action: string,
  details: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}
