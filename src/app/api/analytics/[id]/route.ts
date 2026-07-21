import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-helper';
import { UserRole } from '@prisma/client';

// GET /api/analytics/:id - Get analytics for a QR code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse time range query parameter (today, 7d, 30d, all)
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';

  try {
    const qr = await prisma.qRCode.findUnique({
      where: { id },
    });

    if (!qr) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    // Ownership verification
    if (qr.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate start date based on range
    const now = new Date();
    let startDate: Date | undefined;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } // 'all' means startDate remains undefined

    const dateFilter = startDate ? { timestamp: { gte: startDate } } : {};
    const whereClause = { qrCodeId: id, ...dateFilter };

    // 1. Total Scans count
    const totalScans = await prisma.scanLog.count({
      where: whereClause,
    });

    // 2. Unique Scans (Count unique IP hashes)
    const uniqueGroups = await prisma.scanLog.groupBy({
      by: ['ipHash'],
      where: whereClause,
    });
    const uniqueScans = uniqueGroups.length;

    // 3. Group by Browser
    const rawBrowsers = await prisma.scanLog.groupBy({
      by: ['browser'],
      _count: { id: true },
      where: whereClause,
    });
    const browsers = rawBrowsers.map((b) => ({
      name: b.browser || 'Unknown',
      count: b._count.id,
    }));

    // 4. Group by OS
    const rawOs = await prisma.scanLog.groupBy({
      by: ['os'],
      _count: { id: true },
      where: whereClause,
    });
    const osList = rawOs.map((o) => ({
      name: o.os || 'Unknown',
      count: o._count.id,
    }));

    // 5. Group by Device Type
    const rawDevices = await prisma.scanLog.groupBy({
      by: ['deviceType'],
      _count: { id: true },
      where: whereClause,
    });
    const devices = rawDevices.map((d) => ({
      name: d.deviceType || 'desktop',
      count: d._count.id,
    }));

    // 6. Group by Country & City
    const rawCountries = await prisma.scanLog.groupBy({
      by: ['country'],
      _count: { id: true },
      where: whereClause,
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });
    const countries = rawCountries.map((c) => ({
      name: c.country || 'Unknown',
      count: c._count.id,
    }));

    const rawCities = await prisma.scanLog.groupBy({
      by: ['city'],
      _count: { id: true },
      where: whereClause,
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });
    const cities = rawCities.map((c) => ({
      name: c.city || 'Unknown',
      count: c._count.id,
    }));

    // 7. Group by Referrer
    const rawReferrers = await prisma.scanLog.groupBy({
      by: ['referrer'],
      _count: { id: true },
      where: whereClause,
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });
    const referrers = rawReferrers.map((r) => ({
      name: r.referrer || 'Direct',
      count: r._count.id,
    }));

    // 8. Fetch Daily Scan Log Dates to populate timeline graph
    const logs = await prisma.scanLog.findMany({
      where: whereClause,
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    const dailyScansMap: { [dateStr: string]: number } = {};

    // Initialize dates for range if today/7d/30d
    if (range === '7d' || range === '30d') {
      const days = range === '7d' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = d.toISOString().split('T')[0];
        dailyScansMap[dateKey] = 0;
      }
    } else if (range === 'today') {
      const dateKey = now.toISOString().split('T')[0];
      dailyScansMap[dateKey] = 0;
    }

    // Populate timeline map
    logs.forEach((log) => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      if (dailyScansMap[dateKey] !== undefined) {
        dailyScansMap[dateKey]++;
      } else {
        // Fallback for 'all' or logs outside range (though whereClause covers it)
        dailyScansMap[dateKey] = (dailyScansMap[dateKey] || 0) + 1;
      }
    });

    const timeline = Object.keys(dailyScansMap).map((date) => ({
      date,
      scans: dailyScansMap[date],
    }));

    // 9. Fetch Recent Scan Logs (last 10 scans)
    const recentScans = await prisma.scanLog.findMany({
      where: { qrCodeId: id },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        country: true,
        city: true,
        browser: true,
        os: true,
        deviceType: true,
        referrer: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      qrName: qr.name,
      destinationUrl: qr.destinationUrl,
      totalScans,
      uniqueScans,
      browsers,
      osList,
      devices,
      countries,
      cities,
      referrers,
      timeline,
      recentScans,
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
