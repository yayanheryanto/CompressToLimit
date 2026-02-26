import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CompressToLimit — Compress files exactly to your upload limit.',
  description:
    'Client-side file compressor for images and PDFs. Set a target size and download the compressed result instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="min-h-screen bg-slate-100 antialiased">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
