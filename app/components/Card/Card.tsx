import { secondaryFont } from '@/util/fonts'
import { FC, ReactNode } from 'react'

interface CardProps {
    title: string
    icon: string
    description: ReactNode
    shadow?: boolean
    background?: boolean
}

const Card: FC<CardProps> = ({ title, icon, description, shadow = true, background = true }) => {
    return (
        <div
            className={`card ${background ? 'bg-base-100' : ''} ${shadow ? 'shadow-xl' : ''} text-center md:grid xl:flex md:grid-cols-5`}
        >
            <figure className='flex items-center'>
                <span className='text-7xl lg:text-8xl pt-8 md:pt-0 xl:pt-8'>{icon}</span>
            </figure>
            <div className='card-body md:text-left xl:text-center col-span-4'>
                <h2 className={`${secondaryFont.className} text-4xl`}>{title}</h2>
                <div className='lg:text-xl'>{description}</div>
            </div>
        </div>
    )
}
export default Card
