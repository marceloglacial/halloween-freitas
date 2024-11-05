'use client'
import { secondaryFont } from '@/util/fonts'
import Image from 'next/image'
import { FC, useState } from 'react'

const Results: FC<ResultsProps> = (props): JSX.Element => {
    const [showWinner, setShowWinner] = useState(false)
    const [showVotes, setShowVotes] = useState(false)
    const blurClassName = showWinner ? 'animate-tada' : 'blur-2xl animate-pulse'

    return (
        <div
            data-results-container
            className='flex flex-col gap-16 px-6 py-8 md:px-8 md:py-32 mx-auto text-center'
        >
            <div
                data-results-header
                className='flex flex-col gap-16 items-center justify-center cursor-pointer'
                onClick={() => setShowWinner(true)}
            >
                <h1 className={`text-4xl md:text-7xl text-center  ${secondaryFont.className}`}>
                    {props.page.icon} {props.page.title}
                </h1>
                <div data-results-winner className='grid grid-cols-1 gap-8'>
                    <div className={`avatar justify-center ${blurClassName}`}>
                        <div className='ring-primary ring-offset-base-100 w-64 rounded-full ring ring-offset-8'>
                            <Image
                                alt={`Fantasia de ${props.firstPlace.name}`}
                                src={`https://firebasestorage.googleapis.com/v0/b/halloween-freitas.appspot.com/o/${props.firstPlace.photo}?alt=media`}
                                className={`w-full h-full object-cover object-top aspect-square `}
                                width={192}
                                height={192}
                            />
                        </div>
                    </div>
                    <h1 className={`text-4xl xl:text-6xl ${blurClassName}`}>
                        {props.firstPlace.name}
                    </h1>
                    <div data-results-stats>
                        <div className='stats'>
                            <div className='stat'>
                                <div className='stat-title'>Total de Votos</div>
                                <div className='stat-value'>{props.firstPlace.votes}</div>
                            </div>

                            <div className='stat'>
                                <div className='stat-title'>Porcentagem</div>
                                {props.firstPlace.votes && props.page.totalVotes && (
                                    <div className='stat-value'>
                                        {(
                                            (props.firstPlace.votes / props.page.totalVotes) *
                                            100
                                        ).toFixed(2)}
                                        %
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showVotes && (
                <div data-results-votes className='grid grid-cols-1 gap-8 items-center'>
                    <h2 className=' text-2xl xl:text-5xl text-primary text-center'>
                        Apuração Final: {props.page.totalVotes} votos
                    </h2>
                    <div>
                        {props.page.options.map((option) => {
                            if (!option.votes || !props.page.totalVotes) return

                            return (
                                <div
                                    key={option.id}
                                    className='flex gap-4 w-full items-center justify-center'
                                >
                                    <div className='w-[150px]'>
                                        <p className='text-ellipsis overflow-hidden text-right truncate'>
                                            {option.name}
                                        </p>
                                    </div>
                                    <div className='grow h-4 hidden md:block'>
                                        <progress
                                            className='progress progress-success w-full h-full'
                                            value={option.votes}
                                            max={props.page.totalVotes}
                                        ></progress>
                                    </div>
                                    <div className='flex min-w-[150px] gap-4'>
                                        <span>
                                            {((option.votes / props.page.totalVotes) * 100).toFixed(
                                                2
                                            )}
                                            %
                                        </span>
                                        <span>{option.votes} voto(s)</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {showWinner && !showVotes && (
                <button
                    className='btn btn-primary max-w-fit mx-auto'
                    onClick={() => setShowVotes(!showVotes)}
                >
                    {showVotes ? 'Esconder' : 'Mostrar'} votos
                </button>
            )}
            <div className='md:fixed top-8 right-8 inline-flex z-50 mx-auto'>
                <a className='btn btn-secondary' href={'/resultados'}>
                    Voltar
                </a>
            </div>
        </div>
    )
}
export default Results
