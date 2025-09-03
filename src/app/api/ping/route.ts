import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'pong', timestamp: new Date().toISOString() });
}

export async function POST() {
  return NextResponse.json({ message: 'pong', timestamp: new Date().toISOString() });
}