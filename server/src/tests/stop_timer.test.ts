import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { stopTimer } from '../handlers/stop_timer';
import { eq } from 'drizzle-orm';

describe('stopTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should stop a running timer', async () => {
    // Create a test timer session
    const testTimer = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 300,
        remaining_seconds: 180,
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = testTimer[0].id;
    const result = await stopTimer(timerId);

    // Verify the result
    expect(result).toBeDefined();
    expect(result!.id).toEqual(timerId);
    expect(result!.duration_seconds).toEqual(300);
    expect(result!.remaining_seconds).toEqual(180);
    expect(result!.is_running).toBe(false); // Should be stopped
    expect(result!.is_completed).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update database record when stopping timer', async () => {
    // Create a test timer session
    const testTimer = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 240,
        remaining_seconds: 120,
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = testTimer[0].id;
    const originalUpdatedAt = testTimer[0].updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await stopTimer(timerId);

    // Query the database to verify the update
    const updatedTimer = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, timerId))
      .execute();

    expect(updatedTimer).toHaveLength(1);
    expect(updatedTimer[0].is_running).toBe(false);
    expect(updatedTimer[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(updatedTimer[0].duration_seconds).toEqual(240); // Should remain unchanged
    expect(updatedTimer[0].remaining_seconds).toEqual(120); // Should remain unchanged
  });

  it('should return null for non-existent timer', async () => {
    const nonExistentId = 99999;
    const result = await stopTimer(nonExistentId);

    expect(result).toBeNull();
  });

  it('should stop already stopped timer without error', async () => {
    // Create a timer that's already stopped
    const testTimer = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 180,
        remaining_seconds: 60,
        is_running: false,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = testTimer[0].id;
    const result = await stopTimer(timerId);

    // Should still return the timer, confirming it's stopped
    expect(result).toBeDefined();
    expect(result!.id).toEqual(timerId);
    expect(result!.is_running).toBe(false);
    expect(result!.duration_seconds).toEqual(180);
    expect(result!.remaining_seconds).toEqual(60);
  });

  it('should stop completed timer', async () => {
    // Create a completed timer that's still running (edge case)
    const testTimer = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 300,
        remaining_seconds: 0,
        is_running: true,
        is_completed: true
      })
      .returning()
      .execute();

    const timerId = testTimer[0].id;
    const result = await stopTimer(timerId);

    // Should stop the timer even if it's completed
    expect(result).toBeDefined();
    expect(result!.id).toEqual(timerId);
    expect(result!.is_running).toBe(false);
    expect(result!.is_completed).toBe(true);
    expect(result!.remaining_seconds).toEqual(0);
  });

  it('should preserve all other timer properties when stopping', async () => {
    // Create a timer with specific values
    const testTimer = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 600,
        remaining_seconds: 450,
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = testTimer[0].id;
    const originalCreatedAt = testTimer[0].created_at;
    
    const result = await stopTimer(timerId);

    // Verify all properties are preserved except is_running and updated_at
    expect(result).toBeDefined();
    expect(result!.duration_seconds).toEqual(600);
    expect(result!.remaining_seconds).toEqual(450);
    expect(result!.is_completed).toBe(false);
    expect(result!.created_at.getTime()).toEqual(originalCreatedAt.getTime());
    expect(result!.is_running).toBe(false); // Only this should change
  });
});