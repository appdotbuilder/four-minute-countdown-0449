import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type UpdateTimerSessionInput, type TimerSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTimerSession = async (input: UpdateTimerSessionInput): Promise<TimerSession | null> => {
  try {
    const { id, remaining_seconds, is_running, is_completed } = input;

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (remaining_seconds !== undefined) {
      updateData.remaining_seconds = remaining_seconds;
    }
    
    if (is_running !== undefined) {
      updateData.is_running = is_running;
    }
    
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
    }

    // Update the timer session
    const result = await db.update(timerSessionsTable)
      .set(updateData)
      .where(eq(timerSessionsTable.id, id))
      .returning()
      .execute();

    // Return null if no record was found/updated
    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Timer session update failed:', error);
    throw error;
  }
};