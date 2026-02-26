# CompressToLimit

> Compress files exactly to your upload limit.

100% client-side file compressor for JPG, PNG, and PDF. No server. No upload. Just compress and download.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase Analytics Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create or open a project
2. Enable **Google Analytics** (Project Settings → Integrations)
3. Add a **Web App** (Project Settings → Your apps → `</>`)
4. Copy the config values into `.env.local`:

```bash
cp .env.local.example .env.local
# then fill in your values
```

5. In Firebase Console → Analytics → Events, you'll see these custom events appear:

| Event | Fires when |
|---|---|
| `page_view` | App loads |
| `file_uploaded` | User selects a valid file |
| `compress_started` | User clicks "Compress Now" |
| `compress_success` | Compression finishes successfully |
| `compress_error` | Compression throws an error |
| `file_downloaded` | User downloads result |
| `recompress_clicked` | User clicks "Re-compress" |
| `file_removed` | User removes uploaded file |

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** strict mode
- **Tailwind CSS**
- **Framer Motion** — animations
- **React Hook Form + Zod** — form validation
- **pdf-lib** — PDF compression
- **Sonner** — toast notifications

## Project Structure

```
app/
  page.tsx              # Main orchestrator page + analytics wiring
  layout.tsx            # Root layout with Toaster
  globals.css
components/
  upload-zone.tsx       # Drag & drop upload
  file-card.tsx         # Uploaded file info card
  compression-form.tsx  # Target size form with validation
  result-card.tsx       # Result with preview + download
  progress-bar.tsx      # Animated compression progress
hooks/
  use-analytics.ts      # Page-view on mount + typed event helpers
lib/
  analytics.ts          # Firebase init + typed event wrappers
  compress-image.ts     # Binary search quality compression
  compress-pdf.ts       # pdf-lib metadata stripping
  format-size.ts        # Byte formatting utilities
types/
  file.ts               # Shared TypeScript types
.env.local.example      # Firebase config template
```

## Features

- Drag & drop or click to upload
- Image preview on upload and in result
- Binary search quality adjustment (14 iterations max)
- Automatic dimension scaling if quality alone can't reach target
- PDF metadata stripping + object stream compression
- Animated progress bar with step labels
- Download compressed file
- Re-compress with new target
