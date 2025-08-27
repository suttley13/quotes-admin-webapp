import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get current time in UTC (Vercel cron runs in UTC)
    const now = new Date();
    
    // Cron schedule: "0 */2 * * *" = every 2 hours at minute 0
    // Times: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
    
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    // Calculate next 2-hour boundary
    let nextHour = Math.ceil(currentHour / 2) * 2;
    let nextDay = now.getUTCDate();
    let nextMonth = now.getUTCMonth();
    let nextYear = now.getUTCFullYear();
    
    // If we've passed 22:00, next run is tomorrow at 00:00
    if (nextHour >= 24) {
      nextHour = 0;
      nextDay += 1;
      
      // Handle month/year rollover
      const nextDate = new Date(nextYear, nextMonth, nextDay);
      nextDay = nextDate.getUTCDate();
      nextMonth = nextDate.getUTCMonth();
      nextYear = nextDate.getUTCFullYear();
    }
    
    // If we're exactly at the hour (minute 0) and it's a cron hour, 
    // and we haven't passed the execution time, use current hour
    const isCurrentHourCronHour = currentHour % 2 === 0;
    const isExactlyOnTheHour = currentMinute === 0;
    
    if (isCurrentHourCronHour && currentMinute < 1) {
      // Very close to or at execution time - use current hour
      nextHour = currentHour;
      nextDay = now.getUTCDate();
      nextMonth = now.getUTCMonth();
      nextYear = now.getUTCFullYear();
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