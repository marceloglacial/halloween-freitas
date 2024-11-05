'use client'
import { secondaryFont } from '@/util/fonts'
import Image from 'next/image'
import { FC, useState } from 'react'

const Results: FC<ResultsProps> = (props): JSX.Element => {
    const [showWinner, setShowWinner] = useState(false)
    const blurClassName = showWinner ? 'animate-tada' : 'blur-2xl animate-pulse'

    return (
        <div data-results-container className='flex flex-col gap-16 pb-32 mx-auto text-center'>
            <div className='fixed top-8 right-8 inline-flex z-50'>
                <a className='btn btn-secondary' href={'/resultados'}>
                    Voltar
                </a>
            </div>

            <div
                data-results-header
                className='min-h-screen flex flex-col gap-16 items-center justify-center cursor-pointer'
                onClick={() => setShowWinner(!showWinner)}
            >
                <h1 className={`text-7xl text-center mt-8 ${secondaryFont.className}`}>
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
                    <h1 className={`text-6xl ${blurClassName}`}>{props.firstPlace.name}</h1>
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
            <div data-results-votes>
                <h2 className=' text-5xl text-center pt-24 pb-12'>
                    Apuração Final: {props.page.totalVotes} votos
                </h2>
                {props.page.options.map((option) => {
                    if (!option.votes || !props.page.totalVotes) return

                    return (
                        <div key={option.id} className='flex gap-4 text-2xl w-full items-center'>
                            <div className='min-w-[200px]'>
                                <p className='text-ellipsis overflow-hidden text-right truncate'>
                                    {option.name}
                                </p>
                            </div>
                            <div className='grow w-96 h-6 col-auto'>
                                <progress
                                    className='progress progress-success w-full h-full'
                                    value={option.votes}
                                    max={props.page.totalVotes}
                                ></progress>
                            </div>
                            <div className='flex gap-4 min-w-[300px]'>
                                <span>
                                    {((option.votes / props.page.totalVotes) * 100).toFixed(2)}%
                                </span>
                                <span>{option.votes} voto(s)</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
export default Results
