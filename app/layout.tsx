import './globals.css'
import type { Metadata } from 'next'
import { defaultFont } from '@/util/fonts'

export const metadata: Metadata = {
    title: 'Halloween dos Freitas',
    description: 'Ottawa - On - Canada',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <body className={`bg-black text-white ${defaultFont.className}`}>{children}</body>
        </html>
    )
}
