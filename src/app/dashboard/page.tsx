import React from 'react';
import { auth } from '@/auth';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role || 'VIEWER';

  return <DashboardClient userRole={role} />;
}
export const dynamic = 'force-dynamic';
