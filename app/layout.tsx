import './globals.css'
import type { Metadata } from 'next'
import { defaultFont } from '@/util/fonts'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
    title: 'Halloween dos Freitas',
    description:
        'Preparem suas vassouras e poções, pois a noite mais assustadora do ano se aproxima!',
    openGraph: {
        images: '/open-graph.jpg',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en' className=' scroll-smooth'>
            <body className={`bg-black text-white ${defaultFont.className}`}>
                {children}
                <Analytics />
            </body>
        </html>
    )
}
