import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { type UpdateTimerSessionInput, type CreateTimerSessionInput } from '../schema';
import { updateTimerSession } from '../handlers/update_timer_session';
import { eq } from 'drizzle-orm';

// Create a timer session for testing updates
const createTestTimerSession = async (sessionData: any = {}) => {
  const defaultData = {
    duration_seconds: 300,
    remaining_seconds: 300,
    is_running: false,
    is_completed: false
  };

  const data = { ...defaultData, ...sessionData };

  const result = await db.insert(timerSessionsTable)
    .values(data)
    .returning()
    .execute();

  return result[0];
};

describe('updateTimerSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update remaining_seconds', async () => {
    const session = await createTestTimerSession();
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      remaining_seconds: 150
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(session.id);
    expect(result!.remaining_seconds).toEqual(150);
    expect(result!.duration_seconds).toEqual(300); // Should remain unchanged
    expect(result!.is_running).toEqual(false); // Should remain unchanged
    expect(result!.is_completed).toEqual(false); // Should remain unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update is_running status', async () => {
    const session = await createTestTimerSession();
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      is_running: true
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.is_running).toEqual(true);
    expect(result!.remaining_seconds).toEqual(300); // Should remain unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update is_completed status', async () => {
    const session = await createTestTimerSession();
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      is_completed: true
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.is_completed).toEqual(true);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const session = await createTestTimerSession();
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      remaining_seconds: 0,
      is_running: false,
      is_completed: true
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.remaining_seconds).toEqual(0);
    expect(result!.is_running).toEqual(false);
    expect(result!.is_completed).toEqual(true);
    expect(result!.duration_seconds).toEqual(300); // Should remain unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update the database record', async () => {
    const session = await createTestTimerSession();
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      remaining_seconds: 120,
      is_running: true
    };

    await updateTimerSession(updateInput);

    // Verify the database was actually updated
    const updatedSession = await db.select()
      .from(timerSessionsTable)
      .where(eq(timerSessionsTable.id, session.id))
      .execute();

    expect(updatedSession).toHaveLength(1);
    expect(updatedSession[0].remaining_seconds).toEqual(120);
    expect(updatedSession[0].is_running).toEqual(true);
    expect(updatedSession[0].updated_at).toBeInstanceOf(Date);
    expect(updatedSession[0].updated_at.getTime()).toBeGreaterThan(session.updated_at.getTime());
  });

  it('should return null for non-existent timer session', async () => {
    const updateInput: UpdateTimerSessionInput = {
      id: 99999, // Non-existent ID
      remaining_seconds: 100
    };

    const result = await updateTimerSession(updateInput);

    expect(result).toBeNull();
  });

  it('should handle updating with remaining_seconds of 0', async () => {
    const session = await createTestTimerSession({ remaining_seconds: 30 });
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      remaining_seconds: 0
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.remaining_seconds).toEqual(0);
  });

  it('should preserve unchanged fields when updating partial data', async () => {
    const session = await createTestTimerSession({
      duration_seconds: 600,
      remaining_seconds: 400,
      is_running: true,
      is_completed: false
    });
    
    const updateInput: UpdateTimerSessionInput = {
      id: session.id,
      remaining_seconds: 350 // Only update remaining time
    };

    const result = await updateTimerSession(updateInput);

    expect(result).not.toBeNull();
    expect(result!.duration_seconds).toEqual(600); // Preserved
    expect(result!.remaining_seconds).toEqual(350); // Updated
    expect(result!.is_running).toEqual(true); // Preserved
    expect(result!.is_completed).toEqual(false); // Preserved
    expect(result!.created_at).toEqual(session.created_at); // Preserved
    expect(result!.updated_at.getTime()).toBeGreaterThan(session.updated_at.getTime()); // Updated
  });
});