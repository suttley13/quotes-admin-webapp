import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Get all users
    const users = await sql`SELECT * FROM users`;
    
    return NextResponse.json({
      success: true,
      users: users.rows,
      count: users.rows.length,
      currentUTCTime: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}