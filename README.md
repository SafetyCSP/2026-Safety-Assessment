# 2026 Grainger Safety Assessment Tool

A comprehensive AI-powered site safety assessment tool built with Next.js. Evaluate regulatory compliance against OSHA, TJC, DNV, and CMS standards with AI-assisted analysis.

## Features

- **Multi-Standard Assessment** — Questions mapped to OSHA, TJC, DNV, and CMS regulatory references
- **AI Chat Assistant** — Gemini-powered assistant that searches local standards and external regulations  
- **Image Analysis** — Upload photos for AI-driven compliance analysis
- **Report Generation** — Executive summary with risk breakdown, findings, and export to PDF/CSV/Word
- **Progress Tracking** — Real-time progress indicators across all assessment categories

## Getting Started

### Prerequisites
- Node.js 20+
- A Google Generative AI API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the tool.

### Production Build

```bash
npm run build
npm start
```

## Deployment

### Docker

```bash
docker build -t ai-safety-tool .
docker run -p 3000:3000 -e GOOGLE_GENERATIVE_AI_API_KEY=your_key ai-safety-tool
```

### Vercel

This project is configured to deploy on Vercel. Push to `master` to trigger automatic deployment via the included GitHub Actions workflow.

Set the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable in your Vercel project settings.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: Google Gemini 2.0 Flash
- **Icons**: Lucide React

## License

Private — © 2026 AI Safety Compliance Tool
