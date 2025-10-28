import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/context/AuthContext'

export const metadata: Metadata = {
  title: 'Heart-Shaped Box - Stemmeassistent',
  description: 'AI-drevet stemmeassistent med ChatGPT og Whisper',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
