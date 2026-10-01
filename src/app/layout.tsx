import type { Metadata } from 'next'
import { Newsreader, Outfit } from 'next/font/google'

import { DashboardShell } from '@/components/dashboard-shell'

import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
})

export const metadata: Metadata = {
  title: 'MarketGuru',
  description: 'Place Finder, email discovery, campaign sending, and mailbox warmup in one desk.',
}

type RootLayoutProps = {
  children: React.ReactNode
}

/**
 * Root document with the shared dashboard chrome.
 * @param props - Page content
 */
const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className={`${outfit.variable} ${newsreader.variable}`}>
    <body className="font-sans text-parchment-100 antialiased">
      <DashboardShell>{children}</DashboardShell>
    </body>
  </html>
)

export default RootLayout
