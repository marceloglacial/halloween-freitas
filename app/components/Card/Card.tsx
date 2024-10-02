import { secondaryFont } from '@/util/fonts'
import { FC, ReactNode } from 'react'

interface CardProps {
    title?: string
    icon?: string
    description?: ReactNode
    shadow?: boolean
    background?: boolean
    children?: ReactNode
}

const Card: FC<CardProps> = ({
    title,
    icon,
    description,
    shadow = true,
    background = true,
    children,
}) => {
    return (
        <div
            className={`card ${background ? 'bg-base-100' : ''} ${shadow ? 'shadow-xl' : ''} text-center md:grid xl:flex md:grid-cols-5`}
        >
            {icon && (
                <figure className='flex items-center'>
                    <span className='text-7xl lg:text-8xl pt-8 md:pt-0 xl:pt-8'>{icon}</span>
                </figure>
            )}
            <div className='card-body md:text-left xl:text-center col-span-4'>
                {title && <h2 className={`${secondaryFont.className} text-4xl`}>{title}</h2>}
                {description && <div className='lg:text-xl'>{description}</div>}
                {children && <div className='lg:text-xl'>{children}</div>}
            </div>
        </div>
    )
}
export default Card
