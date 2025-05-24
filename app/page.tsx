'use client';

import { useState, useRef } from 'react';

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
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressVideo = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        // Set video dimensions (maintain aspect ratio)
        const maxDimension = 480; // Reduced from 720 to 480
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        // Create canvas for video frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Set up MediaRecorder with more aggressive compression
        const stream = canvas.captureStream(15); // Reduced from default to 15fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 500000, // Reduced from 1Mbps to 500kbps
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(compressedBlob);
        };

        // Start recording
        mediaRecorder.start();

        // Draw video frames
        video.oncanplay = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
          }
        };

        // Play video
        video.play();

        // Stop recording after video ends
        video.onended = () => {
          mediaRecorder.stop();
        };
      };

      video.onerror = () => reject(new Error('Error loading video'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let response;

      if (uploadMethod === 'url') {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl }),
        });
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          throw new Error('No file selected');
        }

        // Compress video
        const compressedBlob = await compressVideo(file);

        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data URL prefix
          };
        });
        reader.readAsDataURL(compressedBlob);
        const base64 = await base64Promise;

        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoData: base64 }),
        });
      }

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

  return (
    <div className='min-h-screen p-8'>
      <main className='max-w-2xl mx-auto'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          English Accent Analyzer
        </h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='flex space-x-4 mb-4'>
            <button
              type='button'
              onClick={() => setUploadMethod('url')}
              className={`flex-1 py-2 px-4 rounded-md ${
                uploadMethod === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              URL Upload
            </button>
            <button
              type='button'
              onClick={() => setUploadMethod('file')}
              className={`flex-1 py-2 px-4 rounded-md ${
                uploadMethod === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              File Upload
            </button>
          </div>

          {uploadMethod === 'url' ? (
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
          ) : (
            <div>
              <label
                htmlFor='videoFile'
                className='block text-sm font-medium mb-2'
              >
                Upload Video File
              </label>
              <input
                type='file'
                id='videoFile'
                ref={fileInputRef}
                accept='video/*'
                required
                className='w-full p-2 border rounded-md'
              />
            </div>
          )}

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
