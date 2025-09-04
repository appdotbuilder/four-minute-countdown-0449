import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type CreateTimerSessionInput, type TimerSession } from '../schema';

export const createTimerSession = async (input: CreateTimerSessionInput): Promise<TimerSession> => {
  try {
    // Insert timer session record with initial state
    const result = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: input.duration_seconds,
        remaining_seconds: input.duration_seconds, // Initially equals duration
        is_running: false, // Timer starts in stopped state
        is_completed: false, // Timer is not completed initially
      })
      .returning()
      .execute();

    // Return the created timer session
    const timerSession = result[0];
    return {
      ...timerSession,
    };
  } catch (error) {
    console.error('Timer session creation failed:', error);
    throw error;
  }
};