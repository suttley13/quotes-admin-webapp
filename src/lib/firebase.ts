import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  console.log('Environment check:');
  console.log('- FIREBASE_SERVICE_ACCOUNT_JSON exists:', !!serviceAccountJson);
  console.log('- Length:', serviceAccountJson?.length);
  console.log('- First 50 chars:', serviceAccountJson?.substring(0, 50));
  
  if (!serviceAccountJson) {
    console.error('Missing environment variables:');
    console.error('- FIREBASE_SERVICE_ACCOUNT_JSON:', !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    throw new Error('Firebase configuration missing');
  }

  try {
    // Clean and parse the service account JSON
    const cleanedJson = serviceAccountJson.trim().replace(/\s+/g, ' ');
    const serviceAccount = JSON.parse(cleanedJson);
    
    // Fix private key formatting - replace literal \n with actual newlines
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    console.log('Firebase service account parsed successfully');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    // If already initialized, get the default app
    if (error.code === 'app/duplicate-app') {
      firebaseApp = admin.app();
    } else {
      console.error('Firebase initialization error:', error);
      console.error('Service account JSON length:', serviceAccountJson?.length);
      console.error('Service account JSON preview:', serviceAccountJson?.substring(0, 100) + '...');
      throw error;
    }
  }

  return firebaseApp;
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  if (!firebaseApp) {
    initializeFirebase();
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  // Send to each token individually using HTTP v1 API
  for (const token of tokens) {
    try {
      const message = {
        token: token,
        notification: {
          title,
          body,
        },
        data: data || {},
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      console.log(`Attempting to send message to token: ${token.substring(0, 20)}...`);
      console.log(`Message payload:`, JSON.stringify(message, null, 2));
      
      const response = await admin.messaging().send(message);
      successCount++;
      console.log(`Successfully sent notification to token: ${token.substring(0, 20)}..., Response: ${response}`);
    } catch (error: any) {
      failureCount++;
      console.error(`Failed to send to token ${token.substring(0, 20)}...: ${error.message}`);
      console.error(`Error code: ${error.code}, Error details:`, error);
    }
  }

  return { successCount, failureCount };
}