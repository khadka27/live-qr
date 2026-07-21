import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAuthenticatedUser } from '@/lib/auth-helper';

// POST /api/upload - Handle image file uploads
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validation checks
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // 2MB size limit
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique name
    const extension = fileType.split('/')[1] || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    // Target upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'images');
    
    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Write file to public/images
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the relative URL path
    const fileUrl = `/images/${filename}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
