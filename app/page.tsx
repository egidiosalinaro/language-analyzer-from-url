'use client';

import { useState } from 'react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to analyze video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen p-8'>
      <main className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          English Accent Analyzer
        </h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='videoUrl'
              className='block text-sm font-medium mb-2'
            >
              Video URL (Loom or MP4)
            </label>
            <input
              type='url'
              id='videoUrl'
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder='https://...'
              required
              className='w-full p-2 border rounded-md'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50'
          >
            {loading ? 'Analyzing...' : 'Analyze Accent'}
          </button>
        </form>

        {error && (
          <div className='mt-4 p-4 bg-red-100 text-red-700 rounded-md'>
            {error}
          </div>
        )}

        {result && (
          <div className='mt-8 space-y-4'>
            <div className='p-4 bg-gray-50 rounded-md'>
              <h2 className='text-xl font-semibold mb-2'>Results</h2>
              <div className='space-y-2'>
                <p>
                  <span className='font-medium'>Accent:</span> {result.accent}
                </p>
                <p>
                  <span className='font-medium'>Confidence:</span>{' '}
                  {result.confidence ? result.confidence + '%' : 'N/A'}
                </p>
                <div>
                  <span className='font-medium'>Explanation:</span>
                  <p className='mt-1 text-gray-600'>{result.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
