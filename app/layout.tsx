import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Voice Assistant',
  description: 'AI-drevet stemmeassistent med ChatGPT og Whisper',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  )
}
