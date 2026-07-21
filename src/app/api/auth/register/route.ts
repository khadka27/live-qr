import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hashing password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Bootstrap check: If this is the first user, make them ADMIN, otherwise VIEWER
    const userCount = await prisma.user.count();
    const assignedRole = userCount === 0 ? 'ADMIN' : 'VIEWER';

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
      },
    });

    await logAudit(
      newUser.id,
      'USER_REGISTER',
      `Registered user with role ${assignedRole}`
    );

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
