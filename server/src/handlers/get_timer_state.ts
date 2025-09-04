import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type TimerState } from '../schema';
import { eq } from 'drizzle-orm';

// Helper function to format seconds into MM:SS format
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getTimerState = async (id: number): Promise<TimerState | null> => {
    try {
        // Query the database for the timer session
        const results = await db.select()
            .from(timerSessionsTable)
            .where(eq(timerSessionsTable.id, id))
            .execute();

        // Return null if timer session not found
        if (results.length === 0) {
            return null;
        }

        const session = results[0];

        // Return the timer state with formatted time
        return {
            id: session.id,
            duration_seconds: session.duration_seconds,
            remaining_seconds: session.remaining_seconds,
            is_running: session.is_running,
            is_completed: session.is_completed,
            formatted_time: formatTime(session.remaining_seconds)
        };
    } catch (error) {
        console.error('Get timer state failed:', error);
        throw error;
    }
};