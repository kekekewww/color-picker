import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://color-picker-privacy.muddy-pig-6793.chatgpt.site'),
  title: '隱私權政策 / Privacy Policy | Color Picker',
  description: 'Color Picker processes selected color codes on your device. Read how text, preferences and clipboard writes are handled.',
  openGraph: {
    title: 'Color Picker — Privacy policy',
    description: 'Selected color codes are processed on your device. No selected content is sent to the developer or third parties.',
    type: 'website',
    images: [{ url: '/og.png', width: 1400, height: 560, alt: 'Color Picker color swatches' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Color Picker — Privacy policy',
    description: 'Selected color codes are processed on your device.',
    images: ['/og.png'],
  },
  icons: { icon: '/icons/icon48.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
