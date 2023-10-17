import { secondaryFont } from '@/util/fonts'
import { FC, ReactNode } from 'react'

interface SectionProps {
    icon: string
    title: string
    variant?: string
    children: ReactNode
}

const Section: FC<SectionProps> = ({ icon, title, variant, children }) => {
    return (
        <div className={`bg-${variant || 'secondary-focus'} p-24 text-2xl relative`}>
            <div className=' absolute top-[-60px] left-[50%] translate-x-[-50%] text-9xl'>
                {icon}
            </div>
            <h3 className={`${secondaryFont.className} text-8xl text-center`}>{title}</h3>
            <div className='py-24'>{children}</div>
        </div>
    )
}
export default Section
