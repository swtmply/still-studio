import './globals.css';

export const metadata = {
  title: 'Still Studio — A moment to keep',
  description: 'An offline-first photobooth. Take up to six shots, pick your four, and share your video moments.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export const viewport = { themeColor: '#f7f5ef' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
