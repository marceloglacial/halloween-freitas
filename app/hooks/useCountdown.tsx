import { useState, useEffect } from 'react'

export function useCountdown(finalDate: Date) {
    const calculateTimeLeft = () => {
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

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

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
