import { NextApiRequest, NextApiResponse } from 'next';
import { updateUserPreferences, getUserByDeviceId } from '../../../lib/db';

interface PreferencesResponse {
  success: boolean;
  user?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreferencesResponse>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { deviceId, notificationTime, timezone, deviceToken, notificationsEnabled } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    // Check if user exists
    const existingUser = await getUserByDeviceId(deviceId);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user preferences
    const updatedUser = await updateUserPreferences(deviceId, {
      notificationTime,
      timezone,
      deviceToken,
      notificationsEnabled
    });

    console.log('✅ Updated user preferences for device:', deviceId);

    return res.status(200).json({ 
      success: true, 
      user: updatedUser,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences' 
    });
  }
}