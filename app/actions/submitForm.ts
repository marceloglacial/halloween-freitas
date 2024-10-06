'use server'
import { db } from '@/util/firebase'
import { doc, setDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'

export async function submitForm(formData: FormData) {
    const name = formData.get('name')?.toString() || ''
    const email = formData.get('email')?.toString() || ''

    const children: { name: string; isChildren: boolean }[] = []

    for (let i = 0; ; i++) {
        const childName = formData.get(`children[${i}].name`)
        if (childName === null) break
        if (childName) {
            children.push({ name: childName.toString(), isChildren: true })
        }
    }

    try {
        const guestQuery = query(collection(db, 'guests'), where('email', '==', email))
        const guestSnapshot = await getDocs(guestQuery)

        if (!guestSnapshot.empty) {
            throw new Error('Você já está cadastrado.')
        }

        const parentDocRef = doc(collection(db, 'guests'))
        await setDoc(parentDocRef, { name, email, createdAt: serverTimestamp() })

        const childrenCollectionRef = collection(db, 'children')
        const promises = children.map((child) => {
            const childDocRef = doc(childrenCollectionRef)
            return setDoc(childDocRef, { ...child, parentId: parentDocRef.id })
        })

        await Promise.all(promises)

        return { message: 'Obrigado por se cadastrar! Nos vemos na festa!', status: 'success' }
    } catch (error) {
        console.error('Error adding documents:', error)
        // @ts-ignore
        return { message: error.message, status: 'error' }
    }
}
