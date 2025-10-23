import './globals.css';
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Inter, Baumans } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';
import { ClientAnalytics } from '@/components/client-analytics';
// import { Databuddy } from '@databuddy/sdk';

import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://ritivel.ai'),
  title: {
    default: 'Ritivel - Accelerate regulatory intelligence',
    template: '%s | Ritivel',
  },
  description:
    'Ritivel is a free AI search engine that finds, analyzes, and cites the live web. $15/month—fast answers; 10k+ stars on GitHub.',
  openGraph: {
    url: 'https://ritivel.ai',
    siteName: 'Ritivel',
  },
  keywords: [
    'ritivel.ai',
    'free ai search',
    'ai search',
    'ai research tool',
    'ai search tool',
    'perplexity ai alternative',
    'perplexity alternative',
    'chatgpt alternative',
    'ai search engine',
    'search engine',
    'ritivel ai',
    'ritivel AI',
    'ritivel github',
    'ai search engine',
    'ritivel',
    'ritivel.app',
    'ritivel ai',
    'ritivel ai app',
    'ritivel',
    'MiniPerplx',
    'Perplexity alternatives',
    'Perplexity AI alternatives',
    'open source ai search engine',
    'minimalistic ai search engine',
    'minimalistic ai search alternatives',
    'ai search',
    'minimal ai search',
    'minimal ai search alternatives',
    'Regulatory Intelligence Search Engine',
    'Regulatory Intelligence Search Engine Alternative',
    'Compliance Intelligence Search Engine',
    'Compliance Intelligence Search Engine Alternative',
    'Compliance',
    'Life Sciences Search Engine',
    'Life Sciences Search Engine Alternative',
    'Life Sciences',
    'Life Sciences AI',
    'Life Sciences AI Search Engine',
    'Life Sciences AI Search Engine Alternative',
    'Life Sciences AI Search',
    'Life Sciences AI Search Alternative',
    'Life Sciences AI Search Engine',
    'AI Search Engine',
    'mplx.run',
    'mplx ai',
    'zaid mukaddam',
    'ritivel.how',
    'search engine',
    'AI',
    'perplexity',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F9F9' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  weight: 'variable',
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  preload: true,
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const baumans = Baumans({
  subsets: ['latin'],
  variable: '--font-baumans',
  preload: true,
  display: 'swap',
  weight: ['400'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${beVietnamPro.variable} ${baumans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" />
            {children}
          </Providers>
        </NuqsAdapter>
        {/* <Databuddy clientId={process.env.DATABUDDY_CLIENT_ID!} enableBatching={true} trackSessions={true} /> */}
        <ClientAnalytics />
      </body>
    </html>
  );
}
