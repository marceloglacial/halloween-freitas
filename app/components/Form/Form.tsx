'use client'

import { submitForm } from '@/actions/submitForm'
import { useState, FormEvent } from 'react'
import { Card } from '@/components'

const Form: React.FC = () => {
    const initialFormState = { name: '', email: '', children: [] }
    const [formState, setFormState] = useState(initialFormState)
    const [message, setMessage] = useState<string>('')
    const [status, setStatus] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log('Form submitted')
        setMessage('')
        setIsSubmitting(true)

        const formData = new FormData()
        formData.append('name', formState.name)
        formData.append('email', formState.email)

        formState.children.forEach((child: any, index) => {
            formData.append(`children[${index}].name`, child.name)
        })

        try {
            const result = await submitForm(formData)
            console.log('Submission result:', result)
            setMessage(result.message)
            setStatus(result.status)
            setFormState(initialFormState)
        } catch (error) {
            console.error('Error submitting form:', error)
            setMessage('An error occurred while submitting the form.')
            setStatus('error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormState((prev) => ({ ...prev, [name]: value }))
    }

    const handleChildInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        const updatedChildren = [...formState.children]

        // @ts-ignore
        updatedChildren[index] = { ...updatedChildren[index], name: value }
        setFormState((prev) => ({ ...prev, children: updatedChildren }))
    }

    const addChildField = () => {
        // @ts-ignore
        setFormState((prev) => ({
            ...prev,
            children: [...prev.children, { name: '' }],
        }))
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
            <>
                <Card
                    title={'Cadastro concluído com sucesso!'}
                    icon={'🪦'}
                    description={message}
                    background={false}
                    shadow={false}
                />
                <button className='btn btn-secondary' onClick={() => setMessage('')}>
                    Clique aqui para confirmar outra pessoa.
                </button>
            </>
        )

    return (
        <>
            <p className='text-2xl lg:text-3xl text-primary max-w-[600px] mx-auto'>
                Preencha os dados abaixo e confirme sua presença até
                <span className='underline'> 20 de outubro</span>!
            </p>
            <p className='pt-8 text-xs'>
                Cada adulto deve confirmar sua presença com seu e-mail. <br />
                Uma confirmação por pessoa.
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
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                            required
                        />
                    </label>
                    {formState.children.map((child: any, index) => (
                        <div key={index} className='flex gap-2'>
                            <label className='input input-secondary input-lg input-bordered flex items-center gap-2 w-full'>
                                Nome
                                <input
                                    type='text'
                                    name={`childName${index}`}
                                    className='grow bg-transparent'
                                    placeholder='da criança'
                                    value={child.name}
                                    onChange={(e) => handleChildInputChange(index, e)}
                                    disabled={isSubmitting}
                                    required
                                />
                            </label>
                        </div>
                    ))}

                    <button
                        type='button'
                        className='btn btn-outline'
                        onClick={addChildField}
                        disabled={isSubmitting}
                    >
                        Adicionar criança (opicional)
                    </button>

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
