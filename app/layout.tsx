import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InsightCV — AI Resume Analyzer',
  description: 'Analisis CV kamu dengan AI. Dapatkan ATS Score, skill gap, saran improvement, dan posisi yang cocok.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
