import { NextResponse } from 'next/server';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

async function getLoomVideoUrl(loomUrl: string): Promise<string> {
  // Clean the Loom URL by removing the sid parameter
  const cleanUrl = loomUrl.split('?')[0];
  console.log('[analyze] Getting Loom video URL for:', cleanUrl);

  const options = {
    method: 'GET',
    url: 'https://loom-downloader-download-loom-video-from-link.p.rapidapi.com/download',
    params: { url: cleanUrl },
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host':
        'loom-downloader-download-loom-video-from-link.p.rapidapi.com',
    },
  };

  try {
    console.log('[analyze] Making request to RapidAPI with options:', {
      url: options.url,
      params: options.params,
      headers: {
        ...options.headers,
        'x-rapidapi-key': '***', // Hide the API key in logs
      },
    });

    const response = await axios.request(options);
    console.log('[analyze] RapidAPI response:', response.data);

    if (!response.data.download_url) {
      throw new Error('No download URL in RapidAPI response');
    }

    return response.data.download_url;
  } catch (error: any) {
    console.error('[analyze] Error getting Loom video URL:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          ...error.config?.headers,
          'x-rapidapi-key': '***', // Hide the API key in logs
        },
      },
    });
    throw error;
  }
}

async function downloadM3U8Segments(m3u8Url: string): Promise<Buffer> {
  console.log('[analyze] Downloading m3u8 playlist from:', m3u8Url);

  // Extract base URL and auth parameters
  const urlParts = m3u8Url.split('?');
  const baseUrl = urlParts[0].substring(0, urlParts[0].lastIndexOf('/') + 1);
  const authParams = urlParts[1];

  // Download the master playlist
  const playlistResponse = await axios.get(m3u8Url, {
    headers: {
      Accept: '*/*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Origin: 'https://www.loom.com',
      Referer: 'https://www.loom.com/',
    },
  });

  const masterPlaylist = playlistResponse.data.toString();
  console.log('[analyze] Got master playlist:', masterPlaylist);

  // Find the lowest quality stream that's still reasonable
  const streamLines = masterPlaylist.split('\n');
  let lowestBitrate = Infinity;
  let selectedStream = '';

  for (let i = 0; i < streamLines.length; i++) {
    const line = streamLines[i];
    if (line.includes('BANDWIDTH=')) {
      const bitrate = parseInt(line.match(/BANDWIDTH=(\d+)/)?.[1] || '0');
      // Consider streams with bitrate up to 1.5Mbps
      if (bitrate >= 100000 && bitrate <= 1500000 && bitrate < lowestBitrate) {
        lowestBitrate = bitrate;
        selectedStream = streamLines[i + 1];
      }
    }
  }

  if (!selectedStream) {
    throw new Error('No suitable video stream found in playlist');
  }

  // Get the full URL for the selected stream with auth parameters
  const streamUrl = selectedStream.startsWith('http')
    ? selectedStream
    : `${baseUrl}${selectedStream}?${authParams}`;

  console.log(
    '[analyze] Selected stream:',
    streamUrl,
    'with bitrate:',
    lowestBitrate
  );

  // Download the stream playlist
  const streamResponse = await axios.get(streamUrl, {
    headers: {
      Accept: '*/*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Origin: 'https://www.loom.com',
      Referer: 'https://www.loom.com/',
    },
  });

  const streamPlaylist = streamResponse.data.toString();
  console.log('[analyze] Got stream playlist:', streamPlaylist);

  // Parse the stream playlist to get segment URLs
  const segmentUrls = streamPlaylist
    .split('\n')
    .filter((line: string) => line.endsWith('.ts'))
    .map((segment: string) => {
      // Handle relative URLs
      if (segment.startsWith('http')) return segment;
      const streamBaseUrl = streamUrl.substring(
        0,
        streamUrl.lastIndexOf('/') + 1
      );
      return `${streamBaseUrl}${segment}?${authParams}`;
    });

  // Take only the first 5 segments (about 10-15 seconds of video)
  const selectedSegments = segmentUrls.slice(0, 5);
  console.log(
    '[analyze] Selected first',
    selectedSegments.length,
    'segments out of',
    segmentUrls.length
  );

  // Download selected segments
  const segments: Buffer[] = [];
  for (const url of selectedSegments) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Origin: 'https://www.loom.com',
          Referer: 'https://www.loom.com/',
        },
      });
      segments.push(Buffer.from(response.data));
      console.log('[analyze] Downloaded segment:', url);
    } catch (error) {
      console.error('[analyze] Error downloading segment:', url, error);
      throw new Error(`Failed to download segment: ${url}`);
    }
  }

  // Combine selected segments
  const combinedBuffer = Buffer.concat(segments);
  console.log(
    '[analyze] Combined segments, total size:',
    combinedBuffer.length,
    'bytes'
  );

  return combinedBuffer;
}

async function downloadVideo(url: string): Promise<Buffer> {
  if (url.includes('loom.com')) {
    const m3u8Url = await getLoomVideoUrl(url);
    console.log('[analyze] Got m3u8 URL:', m3u8Url);
    return downloadM3U8Segments(m3u8Url);
  }

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrl, videoData } = body;

    if (!videoUrl && !videoData) {
      console.log('[analyze] No video data provided');
      return NextResponse.json(
        { error: 'Video URL or video data is required' },
        { status: 400 }
      );
    }

    let videoBuffer: Buffer;
    if (videoData) {
      // Handle direct video data
      videoBuffer = Buffer.from(videoData, 'base64');
      console.log(
        '[analyze] Received video data, size:',
        videoBuffer.length,
        'bytes'
      );
    } else {
      // Handle video URL
      videoBuffer = await downloadVideo(videoUrl);
      console.log(
        '[analyze] Downloaded video, size:',
        videoBuffer.length,
        'bytes'
      );
    }

    if (videoBuffer.length > 20 * 1024 * 1024) {
      console.log('[analyze] Video too large for inline Gemini API');
      return NextResponse.json(
        { error: 'Video file too large for inline Gemini API (max 20MB)' },
        { status: 400 }
      );
    }

    const videoBase64 = videoBuffer.toString('base64');

    // Prepare Gemini prompt with explicit audio analysis request
    const prompt = `This is a video segment in MPEG-TS format. Please analyze the AUDIO content and answer the following questions:
1. What is the speaker's English accent? (e.g., British, American, Australian, etc.)
2. What is your confidence in this classification (0-100%)?
3. Give a short summary or explanation for your answer, including specific examples of pronunciation patterns you noticed.

IMPORTANT: Focus ONLY on the audio content. Ignore any video content. Listen carefully to the pronunciation patterns.
Respond in JSON with keys: accent, confidence, explanation.`;

    // Prepare Gemini API request
    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'video/MP2T', // MPEG-TS format
                data: videoBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    };

    console.log(
      '[analyze] Gemini payload:',
      JSON.stringify(geminiPayload).slice(0, 500),
      '...'
    );

    const geminiResponse = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      geminiPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log(
      '[analyze] Gemini raw response:',
      JSON.stringify(geminiResponse.data).slice(0, 1000),
      '...'
    );

    // Parse Gemini response
    const text =
      geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[analyze] Gemini response text:', text);

    // Try to extract JSON block and parse
    let accent = '',
      confidence = '',
      explanation = '';
    try {
      // Extract JSON block from markdown if present
      const match = text.match(/```json\s*([\s\S]*?)```/i);
      const jsonString = match ? match[1] : text;
      const json = JSON.parse(jsonString);
      accent = json.accent || '';
      confidence = json.confidence || '';
      explanation = json.explanation || '';
      console.log('[analyze] Parsed JSON:', json);
    } catch (err) {
      console.log(
        '[analyze] Failed to parse JSON, using raw text as explanation.',
        err
      );
      explanation = text;
    }

    return NextResponse.json({
      accent,
      confidence,
      explanation,
      raw: text,
    });
  } catch (error: any) {
    console.error(
      '[analyze] Error processing video with Gemini:',
      error?.response?.data || error
    );
    return NextResponse.json(
      {
        error: 'Failed to process video with Gemini',
        details: error?.response?.data,
      },
      { status: 500 }
    );
  }
}
