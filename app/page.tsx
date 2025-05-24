'use client';

import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    accent: string;
    confidence: string;
    explanation: string;
    raw?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [showTurnstile, setShowTurnstile] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Please complete the verification');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setShowTurnstile(false); // Hide Turnstile after verification

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl, token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze video. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset Turnstile when user starts typing a new URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
    if (result || error) {
      setToken(null);
      setShowTurnstile(true);
      setResult(null);
      setError('');
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8'>
      <main className='max-w-2xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
            English Accent Analyzer
          </h1>
          <p className='text-gray-600'>
            Paste a Loom video URL or any direct video URL to analyze the
            speaker's English accent
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='relative'>
            <input
              type='url'
              value={videoUrl}
              onChange={handleUrlChange}
              placeholder='Paste your video URL here (Loom or direct video link)'
              required
              className='w-full p-4 pl-12 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white shadow-sm placeholder-gray-400 text-gray-800'
            />
            <svg
              className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'></path>
              <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'></path>
            </svg>
          </div>

          {showTurnstile && (
            <div className='flex justify-center'>
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={setToken}
                onError={() => setToken(null)}
                onExpire={() => setToken(null)}
              />
            </div>
          )}

          <button
            type='submit'
            disabled={loading || !token}
            className='w-full bg-gradient-to-r cursor-pointer from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed'
          >
            {loading ? (
              <div className='flex items-center justify-center space-x-3'>
                <svg
                  className='animate-spin h-5 w-5 text-white'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                <span>Analyzing...</span>
              </div>
            ) : (
              'Analyze Accent'
            )}
          </button>
        </form>

        {error && (
          <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center'>
            <svg
              className='w-5 h-5 mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            {error}
          </div>
        )}

        {result && (
          <div className='mt-8'>
            <div className='bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100'>
              <div className='p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h2 className='text-2xl font-bold text-gray-800'>
                    Analysis Results
                  </h2>
                  <div className='px-4 py-2 bg-indigo-100 rounded-full'>
                    <span className='text-indigo-700 font-medium'>
                      {result.confidence}% Confidence
                    </span>
                  </div>
                </div>

                <div className='space-y-6'>
                  <div>
                    <h3 className='text-sm font-medium text-gray-500 mb-2'>
                      Detected Accent
                    </h3>
                    <p className='text-3xl font-bold text-indigo-600'>
                      {result.accent}
                    </p>
                  </div>

                  <div>
                    <h3 className='text-sm font-medium text-gray-500 mb-2'>
                      Analysis
                    </h3>
                    <p className='text-gray-700 leading-relaxed'>
                      {result.explanation}
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-t border-indigo-100'>
                <p className='text-sm text-gray-500'>
                  Made by Egidio Salinaro · Analysis powered by Gemini AI
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
