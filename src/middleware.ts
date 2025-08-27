import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/api/init', 
  '/api/devices/register',
  '/api/quotes/generate',
  '/api/quotes/send',
  '/api/quotes/save',
  '/api/quotes/all',
  '/api/quotes/find',
  '/api/quotes/latest',
  '/api/users/register',
  '/api/favorites/toggle',
  '/api/favorites/list',
  '/api/favorites/clear',
  '/api/cleanup-duplicates',
  '/api/next-quote-time'
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};