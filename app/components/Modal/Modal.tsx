'use client'
import { useRouter } from 'next/navigation'

const Modal = ({ modalId }: { modalId: React.RefObject<HTMLDialogElement> }) => {
    const router = useRouter()
    return (
        <dialog id='voted' ref={modalId} className='modal'>
            <div className='modal-box bg-neutral'>
                <h3 className='font-bold text-lg'>Obrigado!</h3>
                <p className='py-4'>Voto computado com sucesso!</p>
                <div className='modal-action'>
                    <form method='dialog'>
                        <button onClick={() => router.push('/votacao')} className='btn btn-primary'>
                            Voltar para o início
                        </button>
                    </form>
                </div>
            </div>
        </dialog>
    )
}
export default Modal
