'use client'
import Image from 'next/image'
import { FC, FormEvent, MouseEvent, useRef, useState } from 'react'
import Modal from '../Modal/Modal'
import { submitVote } from '@/actions/submitVote'

interface PollFormProps {
    guests: GuestType[]
    pollId: PollType['id']
}

const PollForm: FC<PollFormProps> = (props) => {
    const modal = useRef<HTMLDialogElement>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formState, setFormState] = useState({
        id: '',
        name: '',
        email: '',
        photo: '',
    })

    const openModal = () => {
        if (modal.current) {
            modal.current.show()
        }
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('pollId', props.pollId)
        formData.append('id', formState.id)
        formData.append('name', formState.name)
        formData.append('email', formState.email)
        formData.append('photo', formState.photo)

        try {
            const result = await submitVote(formData)
            if (result) openModal()
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    const handleClick = (e: MouseEvent<HTMLButtonElement>, guest: GuestType) => {
        e.preventDefault()
        setFormState({ ...guest })
    }

    return (
        <>
            <form className='flex flex-col gap-8' onSubmit={handleSubmit}>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-8'>
                    {props.guests.map((guest) => {
                        const selectedStyle =
                            formState.id === guest.id ? 'outline outline-primary rounded-lg' : ''
                        const isSubmittingStyle = isSubmitting
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        return (
                            <button
                                className={`cursor-pointer ${selectedStyle} ${isSubmittingStyle}`}
                                key={guest.id}
                                onClick={(e) => handleClick(e, guest)}
                                disabled={isSubmitting}
                            >
                                <div className=' flex flex-col bg-neutral rounded-lg overflow-hidden'>
                                    <div className='relative w-full aspect-square'>
                                        <Image
                                            src={guest.photo}
                                            fill
                                            className='w-full h-full object-cover object-top'
                                            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                                            alt='photo'
                                        />
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
                <div className='fixed bottom-0 left-0 w-full flex justify-center p-4 bg-neutral'>
                    <button
                        type='submit'
                        className='btn btn-primary w-full'
                        disabled={!formState?.id || isSubmitting}
                    >
                        Votar
                    </button>
                </div>
            </form>
            <Modal modalId={modal} />
        </>
    )
}

export default PollForm
