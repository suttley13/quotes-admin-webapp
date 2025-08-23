import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { isAuthorizedEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    if (!isAuthorizedEmail(email)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get stats
    const [quotesResult, devicesResult, notificationsResult] = await Promise.all([
      sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent FROM quotes`,
      sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE active = true) as active FROM device_tokens`,
      sql`SELECT COUNT(*) as total, SUM(recipient_count) as total_recipients, SUM(success_count) as total_success FROM notifications`
    ]);

    const stats = {
      quotes: {
        total: parseInt(quotesResult.rows[0].total),
        sent: parseInt(quotesResult.rows[0].sent)
      },
      devices: {
        total: parseInt(devicesResult.rows[0].total),
        active: parseInt(devicesResult.rows[0].active)
      },
      notifications: {
        total: parseInt(notificationsResult.rows[0].total || '0'),
        totalRecipients: parseInt(notificationsResult.rows[0].total_recipients || '0'),
        totalSuccess: parseInt(notificationsResult.rows[0].total_success || '0')
      }
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}