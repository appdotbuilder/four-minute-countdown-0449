import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { startTimer } from '../handlers/start_timer';
import { eq } from 'drizzle-orm';

describe('startTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start a timer session successfully', async () => {
    // Create a test timer session first
    const createResult = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 300,
        remaining_seconds: 240,
        is_running: false,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = createResult[0].id;
    const originalUpdatedAt = createResult[0].updated_at;

    // Start the timer
    const result = await startTimer(timerId);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(timerId);
    expect(result!.duration_seconds).toEqual(300);
    expect(result!.remaining_seconds).toEqual(240);
    expect(result!.is_running).toBe(true);
    expect(result!.is_completed).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should update the database record correctly', async () => {
    // Create a test timer session
    const createResult = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 180,
        remaining_seconds: 120,
        is_running: false,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = createResult[0].id;

    // Start the timer
    await startTimer(timerId);

    // Query the database directly to verify the update
    const dbRecord = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, timerId))
      .execute();

    expect(dbRecord).toHaveLength(1);
    expect(dbRecord[0].is_running).toBe(true);
    expect(dbRecord[0].duration_seconds).toEqual(180);
    expect(dbRecord[0].remaining_seconds).toEqual(120);
    expect(dbRecord[0].is_completed).toBe(false);
    expect(dbRecord[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null when timer session does not exist', async () => {
    // Try to start a non-existent timer
    const result = await startTimer(999);

    expect(result).toBeNull();
  });

  it('should start an already completed timer', async () => {
    // Create a completed timer session
    const createResult = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 300,
        remaining_seconds: 0,
        is_running: false,
        is_completed: true
      })
      .returning()
      .execute();

    const timerId = createResult[0].id;

    // Start the completed timer
    const result = await startTimer(timerId);

    // Should successfully start even if completed
    expect(result).not.toBeNull();
    expect(result!.is_running).toBe(true);
    expect(result!.is_completed).toBe(true); // Completion status should remain
    expect(result!.remaining_seconds).toEqual(0);
  });

  it('should start an already running timer', async () => {
    // Create a running timer session
    const createResult = await db.insert(timerSessionsTable)
      .values({
        duration_seconds: 240,
        remaining_seconds: 150,
        is_running: true,
        is_completed: false
      })
      .returning()
      .execute();

    const timerId = createResult[0].id;
    const originalUpdatedAt = createResult[0].updated_at;

    // Start the already running timer
    const result = await startTimer(timerId);

    // Should update the updated_at timestamp even if already running
    expect(result).not.toBeNull();
    expect(result!.is_running).toBe(true);
    expect(result!.remaining_seconds).toEqual(150);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should preserve all other timer properties when starting', async () => {
    // Create a timer with specific values
    const originalData = {
      duration_seconds: 600,
      remaining_seconds: 450,
      is_running: false,
      is_completed: false
    };

    const createResult = await db.insert(timerSessionsTable)
      .values(originalData)
      .returning()
      .execute();

    const timerId = createResult[0].id;
    const originalCreatedAt = createResult[0].created_at;

    // Start the timer
    const result = await startTimer(timerId);

    // Verify all original properties are preserved except is_running and updated_at
    expect(result).not.toBeNull();
    expect(result!.duration_seconds).toEqual(originalData.duration_seconds);
    expect(result!.remaining_seconds).toEqual(originalData.remaining_seconds);
    expect(result!.is_completed).toEqual(originalData.is_completed);
    expect(result!.created_at).toEqual(originalCreatedAt);
    expect(result!.is_running).toBe(true); // Only this should change
  });
});