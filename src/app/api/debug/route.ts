import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const firebaseEnvVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  return NextResponse.json({
    hasFirebaseServiceAccount: !!firebaseEnvVar,
    length: firebaseEnvVar?.length || 0,
    preview: firebaseEnvVar?.substring(0, 100) || 'Not found',
    allFirebaseVars: Object.keys(process.env).filter(key => key.startsWith('FIREBASE')),
    nodeEnv: process.env.NODE_ENV,
  });
}