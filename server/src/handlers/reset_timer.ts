import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type TimerSession } from '../schema';
import { eq } from 'drizzle-orm';

export const resetTimer = async (id: number): Promise<TimerSession | null> => {
  try {
    // First, find the existing timer session to get the original duration
    const existingSession = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, id))
      .execute();

    if (existingSession.length === 0) {
      return null;
    }

    const session = existingSession[0];

    // Reset the timer: remaining_seconds = duration_seconds, stop running, mark as not completed
    const result = await db.update(timerSessionsTable)
      .set({
        remaining_seconds: session.duration_seconds, // Reset to full duration
        is_running: false, // Stop the timer
        is_completed: false, // Mark as not completed
        updated_at: new Date() // Update timestamp
      })
      .where(eq(timerSessionsTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Timer reset failed:', error);
    throw error;
  }
};