import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cyber Crime Reporting Portal – AI-Powered Fraud Response',
  description: 'National Cyber Crime Reporting Portal with AI-powered real-time fraud incident response. Report UPI scams, phishing, and banking fraud instantly.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-950`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
