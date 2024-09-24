'use server'
import { db } from '@/util/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function submitForm(formData: FormData) {
    const name = formData.get('name')?.toString() || '';
    const email = formData.get('email')?.toString() || '';

    try {
        const today = new Date().toISOString().split('T')[0];
        const emailDocRef = doc(collection(db, 'guests'), email);
        const checksRef = doc(collection(db, 'emailValidation'), email);

        const emailDoc = await getDoc(emailDocRef);
        const checksDoc = await getDoc(checksRef);

        let checkCount = 0;
        if (checksDoc.exists() && checksDoc.data().lastCheckDate === today) {
            checkCount = checksDoc.data().checkCount;
            if (checkCount >= 5) {
                throw new Error('Você já está cadastrado. Favor não insistir.');
            }
        }

        if (emailDoc.exists()) {
            await updateDoc(checksRef, {
                lastCheckDate: today,
                checkCount: checkCount + 1,
            });
            throw new Error('Você já está cadastrado.');
        }

        // Add new email and update check count
        await setDoc(emailDocRef, { name, email, createdAt: serverTimestamp(), });
        await setDoc(checksRef, {
            lastCheckDate: today,
            checkCount: checkCount + 1,
        });

        return { message: 'Obrigado por se cadastrar! Nos vemos na festa!', status: 'success' };
    } catch (error) {
        // @ts-ignore
        return { message: error.message, status: 'error' };
    }
}
