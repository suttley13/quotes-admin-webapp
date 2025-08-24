'use client';

import { useState, useEffect } from 'react';

interface Stats {
  quotes: {
    total: number;
    sent: number;
  };
  devices: {
    total: number;
    active: number;
  };
  notifications: {
    total: number;
    totalRecipients: number;
    totalSuccess: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrationMessage(null);
    
    try {
      const response = await fetch('/api/migrate', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMigrationMessage('Database migration completed successfully! ✅');
      } else {
        setMigrationMessage(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      setMigrationMessage('Migration failed: Network error');
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p className="text-gray-500 text-center">Unable to load dashboard stats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Quotes</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.quotes.total}</p>
          <p className="text-sm text-gray-600 mt-1">{stats.quotes.sent} sent</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Active Devices</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.devices.active}</p>
          <p className="text-sm text-gray-600 mt-1">of {stats.devices.total} registered</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Notifications Sent</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.notifications.total}</p>
          <p className="text-sm text-gray-600 mt-1">{stats.notifications.totalSuccess} delivered</p>
        </div>
      </div>

      {stats.notifications.total > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Stats</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-medium">
                  {Math.round((stats.notifications.totalSuccess / stats.notifications.totalRecipients) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${Math.round((stats.notifications.totalSuccess / stats.notifications.totalRecipients) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Migration Button */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Database Migration</h3>
        <p className="text-sm text-yellow-700 mb-4">
          Run this once to add the new database columns for enhanced quotes (meaning, application, author summary).
        </p>
        <button
          onClick={runMigration}
          disabled={migrating}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {migrating ? 'Running Migration...' : 'Run Database Migration'}
        </button>
        {migrationMessage && (
          <div className={`mt-3 p-3 rounded-md ${migrationMessage.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {migrationMessage}
          </div>
        )}
      </div>
    </div>
  );
}