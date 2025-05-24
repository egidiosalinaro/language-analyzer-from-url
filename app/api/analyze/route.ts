import { NextResponse } from 'next/server';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent';

async function downloadVideo(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();
    console.log('[analyze] Received videoUrl:', videoUrl);

    if (!videoUrl) {
      console.log('[analyze] No videoUrl provided');
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      );
    }

    // Download video file
    const videoBuffer = await downloadVideo(videoUrl);
    console.log(
      '[analyze] Downloaded video, size:',
      videoBuffer.length,
      'bytes'
    );

    if (videoBuffer.length > 20 * 1024 * 1024) {
      console.log('[analyze] Video too large for inline Gemini API');
      return NextResponse.json(
        { error: 'Video file too large for inline Gemini API (max 20MB)' },
        { status: 400 }
      );
    }
    const videoBase64 = videoBuffer.toString('base64');

    // Prepare Gemini prompt
    const prompt = `Given the following video, answer:\n1. What is the speaker's English accent? (e.g., British, American, Australian, etc.)\n2. What is your confidence in this classification (0-100%)?\n3. Give a short summary or explanation for your answer.\nRespond in JSON with keys: accent, confidence, explanation.`;

    // Prepare Gemini API request (correct structure)
    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'video/mp4',
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
