import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get current time in UTC (Vercel cron runs in UTC)
    const now = new Date();
    
    // Cron schedule: "0 */2 * * *" = every 2 hours at minute 0
    // Times: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
    
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentSecond = now.getUTCSeconds();
    
    // Find the next 2-hour boundary
    // If we're currently at a 2-hour boundary (even hour) and haven't passed minute 0, use current hour
    // Otherwise, find the next even hour
    
    let nextHour;
    let nextDay = now.getUTCDate();
    let nextMonth = now.getUTCMonth();
    let nextYear = now.getUTCFullYear();
    
    if (currentHour % 2 === 0 && currentMinute === 0 && currentSecond < 10) {
      // We're at or very close to execution time - use current hour
      nextHour = currentHour;
    } else {
      // Find next even hour
      if (currentHour % 2 === 0) {
        // We're on an even hour but past minute 0, so next execution is +2 hours
        nextHour = currentHour + 2;
      } else {
        // We're on an odd hour, so next execution is next even hour
        nextHour = currentHour + 1;
      }
    }
    
    // Handle day rollover
    if (nextHour >= 24) {
      nextHour = nextHour - 24;
      nextDay += 1;
      
      // Handle month/year rollover using Date constructor
      const nextDate = new Date(nextYear, nextMonth, nextDay);
      nextDay = nextDate.getUTCDate();
      nextMonth = nextDate.getUTCMonth();
      nextYear = nextDate.getUTCFullYear();
    }
    
    // Create next execution time
    const nextExecution = new Date(Date.UTC(nextYear, nextMonth, nextDay, nextHour, 0, 0, 0));
    
    // Calculate time remaining
    const timeUntilNext = nextExecution.getTime() - now.getTime();
    const secondsUntilNext = Math.max(0, Math.floor(timeUntilNext / 1000));
    
    // Format for display
    const hours = Math.floor(secondsUntilNext / 3600);
    const minutes = Math.floor((secondsUntilNext % 3600) / 60);
    const seconds = secondsUntilNext % 60;
    
    return NextResponse.json({
      success: true,
      nextExecutionTime: nextExecution.toISOString(),
      secondsUntilNext,
      timeRemaining: {
        hours,
        minutes,
        seconds,
        totalSeconds: secondsUntilNext
      },
      schedule: "Every 2 hours",
      cronExpression: "0 */2 * * *",
      currentTime: now.toISOString()
    });

  } catch (error) {
    console.error('Error calculating next quote time:', error);
    return NextResponse.json(
      { error: 'Failed to calculate next quote time' },
      { status: 500 }
    );
  }
}