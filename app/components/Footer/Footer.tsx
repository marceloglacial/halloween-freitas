const Footer = () => {
    return (
        <footer className='footer footer-center p-10 bg-primary gap-4 text-primary-content text-xl relative z-50'>
            <nav>
                <div className='grid grid-cols-1 md:grid-flow-col gap-4 underline'>
                    <a
                        href='https://github.com/marceloglacial'
                        role='link'
                        aria-label='link to Marcelo Glacial`s github'
                        target='_blank'
                    >
                        developed by marcelo glacial
                    </a>
                    <span className=' hidden md:inline'>|</span>
                    <a
                        href='https://www.vecteezy.com/video/1625536-mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds'
                        role='link'
                        aria-label='video by diizlerza'
                        target='_blank'
                    >
                        video by diizlerza
                    </a>
                </div>
            </nav>
        </footer>
    )
}
export default Footer
