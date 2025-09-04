import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type TimerSession } from '../schema';
import { eq } from 'drizzle-orm';

export const stopTimer = async (id: number): Promise<TimerSession | null> => {
  try {
    // Update the timer session to stop it
    const result = await db.update(timerSessionsTable)
      .set({
        is_running: false,
        updated_at: new Date()
      })
      .where(eq(timerSessionsTable.id, id))
      .returning()
      .execute();

    // Return null if timer session not found
    if (result.length === 0) {
      return null;
    }

    // Return the updated timer session
    const timerSession = result[0];
    return {
      id: timerSession.id,
      duration_seconds: timerSession.duration_seconds,
      remaining_seconds: timerSession.remaining_seconds,
      is_running: timerSession.is_running,
      is_completed: timerSession.is_completed,
      created_at: timerSession.created_at,
      updated_at: timerSession.updated_at
    };
  } catch (error) {
    console.error('Stop timer failed:', error);
    throw error;
  }
};