'use server';
import { db } from '@/util/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function submitForm(formData: FormData) {
    const name = formData.get('name')?.toString() || '';
    const email = formData.get('email')?.toString() || '';

    const children: { name: string; isChildren: boolean }[] = [];


    for (let i = 0; ; i++) {
        const childName = formData.get(`children[${i}].name`);
        if (childName === null) break;
        if (childName) {
            children.push({ name: childName.toString(), isChildren: true });
        }
    }


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


        await setDoc(emailDocRef, { name, email, createdAt: serverTimestamp() });
        await setDoc(checksRef, {
            lastCheckDate: today,
            checkCount: checkCount + 1,
        });


        const parentDocRef = doc(collection(db, 'guests'));
        await setDoc(parentDocRef, { name, email, createdAt: serverTimestamp() });


        const childrenCollectionRef = collection(db, 'children');
        const promises = children.map((child) => {
            const childDocRef = doc(childrenCollectionRef);
            return setDoc(childDocRef, { ...child, parentId: parentDocRef.id });
        });

        await Promise.all(promises);

        return { message: 'Obrigado por se cadastrar! Nos vemos na festa!', status: 'success' };
    } catch (error) {
        console.error("Error adding documents:", error);
        // @ts-ignore
        return { message: error.message, status: 'error' };
    }
}
