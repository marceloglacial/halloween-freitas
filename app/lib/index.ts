'use server'
import { db } from '@/util/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
// import { getDownloadURL, ref } from 'firebase/storage';

export const getCollectionById = async (collectionId: string) => {
    try {
        const collectionRef = collection(db, collectionId)
        const snapshot = await getDocs(collectionRef)
        const collectionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        return collectionData
    } catch (e) {
        throw Error
    }
}

export const getPollById = async (id: PollType['id']) => {
    try {
        const pollDocRef = doc(db, 'polls', id)
        const pollDoc = await getDoc(pollDocRef)

        if (!pollDoc.exists()) throw new Error

        return { id: pollDoc.id, ...pollDoc.data() }

    } catch (error: any) {
        throw new Error(error.message)
    }
}

export const getStorageUrlByFileName = async (fileName: string): Promise<string | null> => {
    try {
        // const fileRef = ref(storage, fileName);
        // const downloadUrl = await getDownloadURL(fileRef);
        const downloadUrl = await `https://firebasestorage.googleapis.com/v0/b/halloween-freitas.appspot.com/o/${fileName}?alt=media`;
        return downloadUrl;
    } catch (error: any) {
        console.error('Error getting Firebase Storage URL:', error);
        throw new Error(error.message)
    }
};
