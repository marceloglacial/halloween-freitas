const NavBar = () => {
    return (
        <div className='navbar fixed top-0 left-0 right-0 z-50'>
            <div className='navbar-start'>
                <div className='dropdown'>
                    <label tabIndex={0} className='btn btn-ghost'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-5 w-5'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth='2'
                                d='M4 6h16M4 12h8m-8 6h16'
                            />
                        </svg>
                    </label>
                    <ul
                        tabIndex={0}
                        className='menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52'
                    >
                        <li>
                            <a>Item 1</a>
                        </li>

                        <li>
                            <a>Item 3</a>
                        </li>
                    </ul>
                </div>
                <a className='btn btn-ghost normal-case text-xl'>daisyUI</a>
            </div>
        </div>
    )
}
export default NavBar
