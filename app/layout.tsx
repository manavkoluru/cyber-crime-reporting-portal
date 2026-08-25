import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cyber Crime Reporting Portal – File a Complaint in Under 2 Minutes',
  description: 'National Cyber Crime Reporting Portal. File your fraud complaint in under 2 minutes, get instant guidance, and act fast in the critical first hour. Report UPI scams, phishing, and banking fraud. Available 24/7.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
