import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, logAudit } from '@/lib/auth-helper';
import { UserRole } from '@prisma/client';

// PUT /api/admin/users - Update user role
export async function PUT(request: NextRequest) {
  const caller = await getAuthenticatedUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Must be ADMIN
  if (caller.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and Role are required' }, { status: 400 });
    }

    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid User Role' }, { status: 400 });
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await logAudit(
      caller.id,
      'USER_ROLE_UPDATE',
      `Changed role of user "${targetUser.email}" from ${targetUser.role} to ${role}`
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
