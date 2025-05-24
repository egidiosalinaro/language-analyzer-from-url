# English Accent Analyzer

A Next.js application that analyzes English accents from video URLs, powered by Gemini AI. This tool can help identify and explain different English accents from video content, particularly useful for language learning and accent analysis.

## Features

- 🔍 Analyze English accents from video URLs
- 🎥 Support for Loom videos and direct video links
- 🤖 Powered by Gemini AI for accurate accent detection
- 🛡️ Protected by Cloudflare Turnstile to prevent abuse
- 📱 Responsive and modern UI with Tailwind CSS
- ⚡ Built with Next.js 15 for optimal performance

## Prerequisites

Before you begin, ensure you have the following:

- Node.js 18.0 or later
- npm, yarn, or pnpm
- API keys for:
  - Gemini AI
  - RapidAPI (Loom Downloader)
  - Cloudflare Turnstile

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
RAPIDAPI_KEY=your_rapidapi_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

## Getting Started

The application is available online at [https://language-analyzer-from-url.vercel.app/](https://language-analyzer-from-url.vercel.app/)

To run it locally:

1. Clone the repository:

```bash
git clone https://github.com/egidiosalinaro/language-analyzer-from-url.git
cd language-analyzer-from-url
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How It Works

1. Users input a video URL (Loom or direct video link)
2. The application verifies the user through Cloudflare Turnstile
3. For Loom videos, the app extracts the video content using RapidAPI
4. The video is processed and analyzed using Gemini AI
5. Results show the detected accent, confidence level, and detailed analysis

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Gemini AI](https://ai.google.dev/) - Accent analysis
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) - Bot protection
- [RapidAPI](https://rapidapi.com/) - Loom video extraction

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is a personal portfolio piece created for demonstration purposes. All rights reserved.

## Author

Made by Egidio Salinaro
