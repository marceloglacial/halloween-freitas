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
            className={`card ${background ? 'bg-base-100' : ''} ${shadow ? 'shadow-xl' : ''} w-full max-w-[700px] mx-auto`}
        >
            <div className='card-body text-center gap-8 items-center'>
                {icon && <span className='text-7xl lg:text-8xl'>{icon}</span>}
                {title && <h2 className={`${secondaryFont.className} text-4xl`}>{title}</h2>}
                {description && <div className='lg:text-xl'>{description}</div>}
                {children && <div className='lg:text-xl'>{children}</div>}
            </div>
        </div>
    )
}
export default Card
