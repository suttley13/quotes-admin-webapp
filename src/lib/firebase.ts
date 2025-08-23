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
  console.log('- All env vars starting with FIREBASE:', Object.keys(process.env).filter(key => key.startsWith('FIREBASE')));
  
  if (!serviceAccountJson) {
    console.error('Missing environment variables:');
    console.error('- FIREBASE_SERVICE_ACCOUNT_JSON:', !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    throw new Error('Firebase configuration missing');
  }

  try {
    console.log('Attempting to parse Firebase JSON...');
    console.log('Character at position 1149:', serviceAccountJson.charAt(1149));
    console.log('Characters around position 1149:', serviceAccountJson.substring(1140, 1160));
    
    // Try to fix common JSON parsing issues
    let fixedJson = serviceAccountJson
      .trim()
      .replace(/\n/g, '')  // Remove actual newlines
      .replace(/\r/g, '')  // Remove carriage returns
      .replace(/\t/g, '')  // Remove tabs
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/\\\\n/g, '\\n')  // Fix double-escaped newlines back to single
      .replace(/\\\\"/g, '\\"')  // Fix double-escaped quotes back to single
      .replace(/\\\\\\\\/g, '\\\\');  // Fix quadruple-escaped backslashes
    
    console.log('Attempting JSON.parse with fixed string...');
    const serviceAccount = JSON.parse(fixedJson);
    
    // Fix private key formatting - replace literal \n with actual newlines
    if (serviceAccount.private_key) {
      console.log('Original private key preview:', serviceAccount.private_key.substring(0, 100));
      
      // Ensure proper PEM format
      let privateKey = serviceAccount.private_key
        .replace(/\\n/g, '\n')  // Replace literal \n with actual newlines
        .replace(/\n+/g, '\n')  // Remove duplicate newlines
        .trim();
      
      // Ensure it starts and ends correctly
      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
      }
      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        privateKey = privateKey + '\n-----END PRIVATE KEY-----';
      }
      
      // Ensure proper line breaks within the key
      privateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n');  // Clean up duplicate newlines
      
      serviceAccount.private_key = privateKey;
      console.log('Fixed private key preview:', privateKey.substring(0, 100));
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