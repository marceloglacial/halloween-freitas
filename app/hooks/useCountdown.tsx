'use client'
import { useState, useEffect } from 'react'

interface CountdownProps {
    days: number
    hours: number
    minutes: number
    seconds: number
}

export function useCountdown(): CountdownProps {
    const finalDate = new Date('Nov 1 2024 18:00:00 EST')
    const calculateTimeLeft = (): CountdownProps => {
        const now = new Date().getTime()
        const difference = finalDate.getTime() - now

        if (difference <= 0) {
            return {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
            }
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        return {
            days,
            hours,
            minutes,
            seconds,
        }
    }

    const [timeLeft, setTimeLeft] = useState<CountdownProps>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    })

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [finalDate])

    return timeLeft
}
