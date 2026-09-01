import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clawback — AI-Powered Revenue Recovery',
  description: 'Autonomous payment recovery intelligence for modern revenue teams.',
  generator: 'Clawback',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#09090b',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
