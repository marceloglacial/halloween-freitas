import { secondaryFont } from '@/util/fonts'
import { FC, ReactNode } from 'react'

interface CardProps {
    title: string
    icon: string
    description: ReactNode
}

const Card: FC<CardProps> = ({ title, icon, description }) => {
    return (
        <div className='card  bg-base-100 shadow-xl text-center'>
            <figure>
                <span className='text-8xl p-8'>{icon}</span>
            </figure>
            <div className='card-body text-center'>
                <h2 className={`${secondaryFont.className} text-4xl`}>{title}</h2>
                <p className='text-xl'>{description}</p>
            </div>
        </div>
    )
}
export default Card
