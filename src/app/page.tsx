'use client';

import { useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import QuoteGenerator from '@/components/QuoteGenerator';
import QuotePreview from '@/components/QuotePreview';
import QuoteHistory from '@/components/QuoteHistory';
import Dashboard from '@/components/Dashboard';

interface Quote {
  id: number;
  text: string;
  author: string | null;
  biography: string | null;
  created_at: string;
  sent_at: string | null;
}

export default function Home() {
  const { user } = useUser();
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'history'>('dashboard');

  const handleQuoteGenerated = (quote: Quote) => {
    setCurrentQuote(quote);
    setActiveTab('generate');
  };

  const handleQuoteSent = () => {
    if (currentQuote) {
      setCurrentQuote({ ...currentQuote, sent_at: new Date().toISOString() });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Spenny Quotes Admin</h1>
              <p className="text-sm text-gray-600">Welcome back, {user.firstName || 'Admin'}</p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'generate', label: 'Generate Quote' },
              { id: 'history', label: 'History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && <Dashboard />}
        
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <QuoteGenerator onQuoteGenerated={handleQuoteGenerated} />
            <QuotePreview quote={currentQuote} onQuoteSent={handleQuoteSent} />
          </div>
        )}
        
        {activeTab === 'history' && <QuoteHistory />}
      </main>
    </div>
  );
}
