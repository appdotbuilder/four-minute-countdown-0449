import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type TimerSession } from '../schema';
import { eq } from 'drizzle-orm';

export const getTimerSession = async (id: number): Promise<TimerSession | null> => {
  try {
    // Query the database for the timer session with the given ID
    const results = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, id))
      .execute();

    // Return null if no session found
    if (results.length === 0) {
      return null;
    }

    // Return the first (and only) result
    const session = results[0];
    return {
      id: session.id,
      duration_seconds: session.duration_seconds,
      remaining_seconds: session.remaining_seconds,
      is_running: session.is_running,
      is_completed: session.is_completed,
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  } catch (error) {
    console.error('Failed to get timer session:', error);
    throw error;
  }
};