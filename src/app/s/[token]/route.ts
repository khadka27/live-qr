import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { validateToken } from '@/lib/tokens';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Rate Limiting (100 requests per minute by default, per IP)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
  
  const limiter = await rateLimit(ip, rateLimitMax, rateLimitWindow);
  if (!limiter.success) {
    return new NextResponse('Too Many Requests. Please wait before scanning again.', {
      status: 429,
      headers: {
        'Retry-After': String(limiter.reset - Math.floor(Date.now() / 1000)),
        'X-RateLimit-Limit': String(limiter.limit),
        'X-RateLimit-Remaining': String(limiter.remaining),
        'X-RateLimit-Reset': String(limiter.reset),
      },
    });
  }

  // 2. Validate Token
  const result = await validateToken(token);

  if (!result.valid) {
    const isExpired = result.reason === 'TOKEN_EXPIRED' || result.reason === 'MAX_USES_EXCEEDED' || result.reason === 'REVOKED_OR_EXPIRED';
    const status = isExpired ? 410 : 404;
    const title = isExpired ? 'QR Code Expired' : 'Invalid QR Code';
    const description = isExpired
      ? 'This secure QR code has expired or reached its maximum scan limit.'
      : 'The QR code you scanned is invalid or does not exist.';

    // Return a styled HTML error page
    const html = `
      <!DOCTYPE html>
      <html lang="en" class="h-full bg-neutral-950 text-white">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Live QR</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="flex min-h-full flex-col items-center justify-center p-6 text-center font-sans antialiased">
        <div class="max-w-md w-full rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 backdrop-blur-md shadow-2xl">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950 border border-red-800 text-red-500 mb-6 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-7 h-7">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight mb-2">${title}</h1>
          <p class="text-neutral-400 text-sm leading-relaxed mb-6">${description}</p>
          <div class="border-t border-neutral-800 pt-6">
            <p class="text-xs text-neutral-500">Live QR Secure Verification Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      status,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 3. Extract Analytics
  const userAgentStr = request.headers.get('user-agent') || '';
  const parser = new UAParser(userAgentStr);
  
  const browser = parser.getBrowser().name || 'Unknown';
  const os = parser.getOS().name || 'Unknown';
  
  // Normalize device type
  let deviceType = parser.getDevice().type || 'desktop';
  if (deviceType === 'mobile' || deviceType === 'tablet' || deviceType === 'desktop') {
    // Already normalized
  } else {
    deviceType = 'desktop'; // Default fallback
  }

  // Geo Location headers (Vercel standard headers fallback to generic)
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
  const referrer = request.headers.get('referer') || 'Direct';

  // Securely hash IP address
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

  // 4. Save Scan Log asynchronously in DB (non-blocking for redirect speed)
  try {
    await prisma.scanLog.create({
      data: {
        tokenId: result.tokenId,
        qrCodeId: result.qrCodeId!,
        country,
        city,
        browser,
        os,
        deviceType,
        referrer,
        ipHash,
      },
    });

    // 4.5. Trigger webhook if configured
    if (result.webhookUrl) {
      fetch(result.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'qr.scan',
          qrCodeId: result.qrCodeId,
          tokenId: result.tokenId,
          timestamp: new Date().toISOString(),
          country,
          city,
          browser,
          os,
          deviceType,
          referrer,
        }),
      }).catch((err) => console.error('Webhook execution failed:', err));
    }
  } catch (error) {
    console.error('Error logging scan analytics:', error);
  }

  // 5. Perform Redirect
  return NextResponse.redirect(result.destinationUrl!, 302);
}
