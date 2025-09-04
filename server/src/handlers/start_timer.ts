import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type TimerSession } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const startTimer = async (id: number): Promise<TimerSession | null> => {
  try {
    // Update the timer session to set is_running to true and update timestamp
    const result = await db.update(timerSessionsTable)
      .set({
        is_running: true,
        updated_at: sql`NOW()` // Use SQL NOW() for accurate server timestamp
      })
      .where(eq(timerSessionsTable.id, id))
      .returning()
      .execute();

    // Return null if no record was found/updated
    if (result.length === 0) {
      return null;
    }

    // Return the updated timer session
    return result[0];
  } catch (error) {
    console.error('Timer start failed:', error);
    throw error;
  }
};