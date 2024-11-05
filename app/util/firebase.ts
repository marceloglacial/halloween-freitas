import { initializeApp, getApps, getApp } from 'firebase/app'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    where,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { serializedData } from '@/util'

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const storage = getStorage(app)
export const db = getFirestore(app)

export const getAllDocsFromCollection = async (
    collectionId: string,
    order?: string
): Promise<ApiResponse> => {
    try {
        const q = order
            ? query(collection(db, collectionId), orderBy(order))
            : collection(db, collectionId)
        const querySnapshot = await getDocs(q)
        const guests = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
        return {
            status: 'success',
            data: serializedData(guests),
        }
    } catch (e) {
        console.error(e)
        return {
            status: 'error',
            error: {
                message: 'Error to get docs from this collection',
                name: 'Error',
            },
            data: null,
        }
    }
}

export const getDocById = async (collectionId: string, docId: string): Promise<ApiResponse> => {
    try {
        const docRef = doc(db, collectionId, docId)
        const docSnapshot = await getDoc(docRef)

        if (docSnapshot.exists()) {
            const guest = { id: docSnapshot.id, ...docSnapshot.data() }
            return {
                status: 'success',
                data: serializedData(guest),
            }
        } else {
            return {
                status: 'error',
                error: {
                    message: 'Document not found',
                    name: 'NotFoundError',
                },
                data: null,
            }
        }
    } catch (e) {
        console.error(e)
        return {
            status: 'error',
            error: {
                message: 'Error getting the document',
                name: 'Error',
            },
            data: null,
        }
    }
}

export const getSingleDocFromCollectionByParam = async (
    collectionId: string,
    param: string,
    value: string
): Promise<ApiResponse> => {
    try {
        const q = query(collection(db, collectionId), where(`${param}`, '==', value))

        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0]
            const guest = {
                id: doc.id,
                ...doc.data(),
            }
            return {
                status: 'success',
                data: serializedData(guest),
            }
        } else {
            return {
                status: 'error',
                data: null,
                error: {
                    name: 'NotFound',
                    message: 'Doc not found',
                },
            }
        }
    } catch (e) {
        console.error(e)
        return {
            status: 'error',
            error: {
                message: 'Error to get Single Document',
                name: 'Error',
            },
            data: null,
        }
    }
}
