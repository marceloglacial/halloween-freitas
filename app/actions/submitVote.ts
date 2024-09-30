'use server';
import { db } from '@/util/firebase';
import { doc, updateDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';

export async function submitVote(formData: FormData): Promise<any> {
    const name = formData.get('name')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const photo = formData.get('photo')?.toString() || '';
    const selectedOption = formData.get('id')?.toString() || '';
    const pollId = formData.get('pollId')?.toString() || '';

    if (!pollId) {
        throw new Error('Poll ID is required');
    }

    try {
        const pollRef = doc(db, 'polls', pollId);
        const pollSnapshot = await getDoc(pollRef);

        if (!pollSnapshot.exists()) {
            throw new Error('Poll does not exist');
        }

        const pollData = pollSnapshot.data() as PollType;


        if (!Array.isArray(pollData.options)) {
            pollData.options = [];
        }

        const optionIndex = pollData.options.findIndex((option) => option.id === selectedOption);

        if (optionIndex !== -1) {

            const updatedOptions = [...pollData.options];
            updatedOptions[optionIndex] = {
                ...updatedOptions[optionIndex],
                votes: updatedOptions[optionIndex].votes + 1,
            };

            await updateDoc(pollRef, {
                options: updatedOptions,
                totalVotes: increment(1),
            });

            console.log(`Vote added to existing option "${selectedOption}" successfully!`);

            return {
                name,
                email,
            };
        } else {

            const newOption: PollOption = {
                id: selectedOption,
                name,
                email,
                photo,
                votes: 1,
            };

            await updateDoc(pollRef, {
                options: arrayUnion(newOption),
                totalVotes: increment(1),
            });

            console.log(`New option "${selectedOption}" added successfully with an initial vote!`);
            return newOption;
        }

    } catch (e) {
        console.error('Error submitting vote:', e);
        throw new Error('Failed to submit vote');
    }
}
