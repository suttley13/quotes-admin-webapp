export function isAuthorizedEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
  return adminEmails.includes(email);
}

export function validateApiKey(apiKey: string): boolean {
  return apiKey === process.env.API_SECRET_KEY;
}