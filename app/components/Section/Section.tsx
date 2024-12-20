import { secondaryFont } from '@/util/fonts'
import { FC, ReactNode } from 'react'

interface SectionProps {
    id?: string
    icon?: string
    title?: string
    variant?: Colors
    children: ReactNode
    wide?: boolean
}

type Colors = 'secondary' | 'base' | 'black'

const Section: FC<SectionProps> = ({ id, icon, title, variant = 'secondary', children, wide }) => {
    const bgColor = {
        secondary: `bg-secondary-focus`,
        base: 'bg-base-100',
        black: 'bg-black',
    }

    return (
        <section id={id} className={`${bgColor[variant]} p-8 py-24 lg:p-24 lg:text-2xl relative`}>
            {icon && (
                <div className=' absolute top-[-60px] left-[50%] translate-x-[-50%] text-9xl'>
                    {icon}
                </div>
            )}
            {title && (
                <h3 className={`${secondaryFont.className} text-5xl lg:text-8xl text-center`}>
                    {title}
                </h3>
            )}
            <div className={`py-12 lg:py-24 ${wide ? '' : 'max-w-screen-xl'} mx-auto`}>
                {children}
            </div>
        </section>
    )
}
export default Section
