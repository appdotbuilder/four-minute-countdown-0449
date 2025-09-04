import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { getTimerSession } from '../handlers/get_timer_session';

describe('getTimerSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return timer session when it exists', async () => {
    // Create a test timer session
    const testSession = {
      duration_seconds: 300, // 5 minutes
      remaining_seconds: 180, // 3 minutes remaining
      is_running: true,
      is_completed: false
    };

    const insertResult = await db.insert(timerSessionsTable)
      .values(testSession)
      .returning()
      .execute();

    const createdSession = insertResult[0];

    // Test the handler
    const result = await getTimerSession(createdSession.id);

    // Verify all fields are returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdSession.id);
    expect(result!.duration_seconds).toBe(300);
    expect(result!.remaining_seconds).toBe(180);
    expect(result!.is_running).toBe(true);
    expect(result!.is_completed).toBe(false);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when timer session does not exist', async () => {
    // Test with non-existent ID
    const result = await getTimerSession(999);

    expect(result).toBeNull();
  });

  it('should return null for negative ID', async () => {
    // Test with negative ID
    const result = await getTimerSession(-1);

    expect(result).toBeNull();
  });

  it('should return null for zero ID', async () => {
    // Test with zero ID
    const result = await getTimerSession(0);

    expect(result).toBeNull();
  });

  it('should handle completed timer sessions', async () => {
    // Create a completed timer session
    const completedSession = {
      duration_seconds: 240, // 4 minutes
      remaining_seconds: 0, // Timer completed
      is_running: false,
      is_completed: true
    };

    const insertResult = await db.insert(timerSessionsTable)
      .values(completedSession)
      .returning()
      .execute();

    const createdSession = insertResult[0];

    // Test the handler
    const result = await getTimerSession(createdSession.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdSession.id);
    expect(result!.duration_seconds).toBe(240);
    expect(result!.remaining_seconds).toBe(0);
    expect(result!.is_running).toBe(false);
    expect(result!.is_completed).toBe(true);
  });

  it('should handle paused timer sessions', async () => {
    // Create a paused timer session
    const pausedSession = {
      duration_seconds: 600, // 10 minutes
      remaining_seconds: 450, // 7.5 minutes remaining
      is_running: false, // Paused
      is_completed: false
    };

    const insertResult = await db.insert(timerSessionsTable)
      .values(pausedSession)
      .returning()
      .execute();

    const createdSession = insertResult[0];

    // Test the handler
    const result = await getTimerSession(createdSession.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdSession.id);
    expect(result!.duration_seconds).toBe(600);
    expect(result!.remaining_seconds).toBe(450);
    expect(result!.is_running).toBe(false);
    expect(result!.is_completed).toBe(false);
  });

  it('should return correct timestamps', async () => {
    // Create a timer session
    const testSession = {
      duration_seconds: 120, // 2 minutes
      remaining_seconds: 60, // 1 minute remaining
      is_running: false,
      is_completed: false
    };

    const insertResult = await db.insert(timerSessionsTable)
      .values(testSession)
      .returning()
      .execute();

    const createdSession = insertResult[0];

    // Test the handler
    const result = await getTimerSession(createdSession.id);

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result!.created_at >= oneMinuteAgo).toBe(true);
    expect(result!.updated_at >= oneMinuteAgo).toBe(true);
    expect(result!.created_at <= now).toBe(true);
    expect(result!.updated_at <= now).toBe(true);
  });
});