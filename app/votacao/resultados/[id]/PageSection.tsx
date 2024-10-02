'use client'

import { Section } from '@/components'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export const PageSection = ({ poll, results }: { poll: PollType; results: PollResult }) => {
    const totalVotes = poll.totalVotes
    const [showResults, setShowResults] = useState(false)

    return (
        <Section title={poll.title} wide={showResults}>
            <div className={`grid gap-8 ${showResults ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div
                    className='contents'
                    key={poll.id}
                    onClick={() => setShowResults(!showResults)}
                >
                    <div className='card items-center bg-neutral p-8'>
                        <ul className='grid grid-cols-1 gap-4 w-full'>
                            {results.sortedOptions.map((guest) => {
                                const votePercentage = (guest.votes / totalVotes) * 100 || 0
                                return (
                                    <li key={guest.id} className='flex gap-4 items-center'>
                                        <div
                                            className={`w-1/4 text-right ${showResults ? '' : 'blur'}`}
                                        >
                                            {guest.name}
                                        </div>
                                        <div className=' w-3/4'>
                                            <div className='w-full bg-gray-200 rounded-xl overflow-hidden relative'>
                                                <span className='absolute top-2 right-4 text-black'>
                                                    {guest.votes} voto(s)
                                                </span>

                                                <div
                                                    className='bg-accent p-2'
                                                    style={{ width: `${votePercentage}%` }}
                                                >
                                                    {votePercentage.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
                {showResults && (
                    <div className='relative w-full min-h-screen h-100 rounded-xl overflow-hidden'>
                        <Image
                            src={results.champion.photo}
                            fill
                            alt='champion'
                            className='w-full h-full object-cover object-top'
                        />
                    </div>
                )}
            </div>
            <div className='flex justify-center p-8'>
                <Link className='btn btn-primary min-w-96' href={'/votacao/resultados'}>
                    Voltar
                </Link>
            </div>
        </Section>
    )
}
