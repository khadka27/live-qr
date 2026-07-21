import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi-spec';

// GET /api/docs - Retrieve OpenAPI Spec JSON
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
