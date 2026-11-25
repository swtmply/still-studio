import './globals.css';

export const metadata = {
  title: 'Moments in Ink',
  description: 'An online photobooth for postcard prints and short animated keepsakes.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export const viewport = { themeColor: '#f7f5ef' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
