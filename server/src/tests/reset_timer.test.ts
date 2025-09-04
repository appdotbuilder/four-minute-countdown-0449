import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { resetTimer } from '../handlers/reset_timer';
import { eq } from 'drizzle-orm';

describe('resetTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should reset a timer to its original duration', async () => {
    // Create a test timer session
    const [createdTimer] = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 300, // 5 minutes
        remaining_seconds: 120, // 2 minutes left
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    // Reset the timer
    const result = await resetTimer(createdTimer.id);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdTimer.id);
    expect(result!.duration_seconds).toEqual(300); // Original duration preserved
    expect(result!.remaining_seconds).toEqual(300); // Reset to full duration
    expect(result!.is_running).toEqual(false); // Timer stopped
    expect(result!.is_completed).toEqual(false); // Marked as not completed
    expect(result!.created_at).toEqual(createdTimer.created_at); // Original creation time preserved
    expect(result!.updated_at).toBeInstanceOf(Date); // Updated timestamp
  });

  it('should save reset state to database', async () => {
    // Create a test timer session that's running and partially completed
    const [createdTimer] = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 240, // 4 minutes
        remaining_seconds: 60, // 1 minute left
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    // Reset the timer
    await resetTimer(createdTimer.id);

    // Query the database to verify the changes were saved
    const [updatedTimer] = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, createdTimer.id))
      .execute();

    expect(updatedTimer.duration_seconds).toEqual(240); // Original duration preserved
    expect(updatedTimer.remaining_seconds).toEqual(240); // Reset to full duration
    expect(updatedTimer.is_running).toEqual(false); // Timer stopped
    expect(updatedTimer.is_completed).toEqual(false); // Marked as not completed
    expect(updatedTimer.updated_at).toBeInstanceOf(Date);
    // Updated timestamp should be newer than created timestamp
    expect(updatedTimer.updated_at.getTime()).toBeGreaterThan(updatedTimer.created_at.getTime());
  });

  it('should reset a completed timer correctly', async () => {
    // Create a completed timer session
    const [createdTimer] = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 180, // 3 minutes
        remaining_seconds: 0, // Timer finished
        is_running: false,
        is_completed: true
      })
      .returning()
      .execute();

    // Reset the timer
    const result = await resetTimer(createdTimer.id);

    // Verify the completed timer is properly reset
    expect(result).toBeDefined();
    expect(result!.duration_seconds).toEqual(180); // Original duration
    expect(result!.remaining_seconds).toEqual(180); // Reset to full duration
    expect(result!.is_running).toEqual(false); // Should be stopped
    expect(result!.is_completed).toEqual(false); // No longer completed
  });

  it('should reset an already stopped timer', async () => {
    // Create a stopped timer session with some remaining time
    const [createdTimer] = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 600, // 10 minutes
        remaining_seconds: 300, // 5 minutes left
        is_running: false, // Already stopped
        is_completed: false
      })
      .returning()
      .execute();

    // Reset the timer
    const result = await resetTimer(createdTimer.id);

    // Verify it resets to full duration even when already stopped
    expect(result).toBeDefined();
    expect(result!.duration_seconds).toEqual(600);
    expect(result!.remaining_seconds).toEqual(600); // Reset to full duration
    expect(result!.is_running).toEqual(false); // Still stopped
    expect(result!.is_completed).toEqual(false); // Still not completed
  });

  it('should return null for non-existent timer', async () => {
    // Try to reset a timer that doesn't exist
    const result = await resetTimer(999999);

    expect(result).toBeNull();
  });

  it('should handle timer with different duration values', async () => {
    // Create a timer with a specific duration
    const [createdTimer] = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 90, // 1.5 minutes
        remaining_seconds: 30, // 30 seconds left
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    // Reset the timer
    const result = await resetTimer(createdTimer.id);

    // Verify it resets to the correct original duration
    expect(result!.duration_seconds).toEqual(90);
    expect(result!.remaining_seconds).toEqual(90); // Should match duration_seconds
    expect(result!.is_running).toEqual(false);
    expect(result!.is_completed).toEqual(false);
  });
});