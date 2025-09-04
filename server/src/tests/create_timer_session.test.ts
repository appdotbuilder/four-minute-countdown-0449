import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type CreateTimerSessionInput } from '../schema';
import { createTimerSession } from '../handlers/create_timer_session';
import { eq } from 'drizzle-orm';

// Test inputs
const defaultInput: CreateTimerSessionInput = {
  duration_seconds: 240 // 4 minutes
};

const customInput: CreateTimerSessionInput = {
  duration_seconds: 600 // 10 minutes
};

describe('createTimerSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a timer session with default duration', async () => {
    const result = await createTimerSession(defaultInput);

    // Basic field validation
    expect(result.duration_seconds).toEqual(240);
    expect(result.remaining_seconds).toEqual(240);
    expect(result.is_running).toEqual(false);
    expect(result.is_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a timer session with custom duration', async () => {
    const result = await createTimerSession(customInput);

    // Validate custom duration is properly set
    expect(result.duration_seconds).toEqual(600);
    expect(result.remaining_seconds).toEqual(600);
    expect(result.is_running).toEqual(false);
    expect(result.is_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save timer session to database', async () => {
    const result = await createTimerSession(defaultInput);

    // Query database to verify the record was saved
    const sessions = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    const savedSession = sessions[0];
    
    expect(savedSession.duration_seconds).toEqual(240);
    expect(savedSession.remaining_seconds).toEqual(240);
    expect(savedSession.is_running).toEqual(false);
    expect(savedSession.is_completed).toEqual(false);
    expect(savedSession.created_at).toBeInstanceOf(Date);
    expect(savedSession.updated_at).toBeInstanceOf(Date);
  });

  it('should initialize remaining_seconds equal to duration_seconds', async () => {
    const testDuration = 1800; // 30 minutes
    const testInput: CreateTimerSessionInput = {
      duration_seconds: testDuration
    };

    const result = await createTimerSession(testInput);

    // Verify remaining seconds equals duration initially
    expect(result.duration_seconds).toEqual(testDuration);
    expect(result.remaining_seconds).toEqual(testDuration);
    expect(result.remaining_seconds).toEqual(result.duration_seconds);
  });

  it('should create multiple timer sessions with unique IDs', async () => {
    const result1 = await createTimerSession(defaultInput);
    const result2 = await createTimerSession(customInput);

    // Verify both sessions are created with unique IDs
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Verify both sessions have correct durations
    expect(result1.duration_seconds).toEqual(240);
    expect(result2.duration_seconds).toEqual(600);
  });

  it('should set initial state correctly for new timer sessions', async () => {
    const result = await createTimerSession(defaultInput);

    // Verify initial state is correct
    expect(result.is_running).toEqual(false); // Timer should not be running initially
    expect(result.is_completed).toEqual(false); // Timer should not be completed initially
    
    // Verify timestamps are set
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify created_at and updated_at are close to current time
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Within 1 second
  });
});