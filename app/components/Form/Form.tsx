'use client'

import { submitForm } from '@/actions/submitForm'
import { useState, FormEvent } from 'react'
import Card from '../Card/Card'

const Form: React.FC = () => {
    const [formState, setFormState] = useState({ name: '', email: '' })
    const [message, setMessage] = useState<string>('')
    const [status, setStatus] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMessage('') // Clear previous message
        setIsSubmitting(true) // Disable form elements

        const formData = new FormData()
        formData.append('name', formState.name)
        formData.append('email', formState.email)

        const result = await submitForm(formData)
        setMessage(result.message)
        setStatus(result.status)
        setIsSubmitting(false) // Re-enable form elements
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormState((prev) => ({ ...prev, [name]: value }))
    }

    if (status === 'error')
        return (
            <Card
                title={'Erro!'}
                icon={'☠️'}
                description={message}
                shadow={false}
                background={false}
            />
        )

    if (message)
        return (
            <Card
                title={'Cadastro concluído com sucesso!'}
                icon={'🪦'}
                description={message}
                background={false}
                shadow={false}
            />
        )

    return (
        <>
            <p className=' text-2xl lg:text-3xl text-primary max-w-[600px] mx-auto'>
                Preencha os dados abaixo e confirme sua presença até
                <span className='  underline'> 20 de outubro</span>!
            </p>
            <form className='form flex w-full justify-center py-8 gap-4' onSubmit={handleSubmit}>
                <div className='form-group flex flex-col gap-8 w-full max-w-[400px]'>
                    <label className='input input-primary input-lg input-bordered flex items-center gap-2'>
                        Nome
                        <input
                            type='text'
                            name='name'
                            className='grow bg-transparent'
                            placeholder='Completo'
                            value={formState.name}
                            onChange={handleInputChange}
                            disabled={isSubmitting} // Disable input while submitting
                            required
                        />
                    </label>
                    <label className='input input-primary input-lg input-bordered flex items-center gap-2'>
                        Email
                        <input
                            type='email'
                            name='email'
                            className='grow bg-transparent'
                            value={formState.email}
                            onChange={handleInputChange}
                            disabled={isSubmitting} // Disable input while submitting
                            required
                        />
                    </label>
                    <button
                        className='btn btn-primary btn-lg'
                        type='submit'
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Enviar'}
                    </button>
                </div>
            </form>
        </>
    )
}
export default Form
