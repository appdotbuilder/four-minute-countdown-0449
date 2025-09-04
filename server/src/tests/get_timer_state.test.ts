import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timerSessionsTable } from '../db/schema';
import { getTimerState } from '../handlers/get_timer_state';

describe('getTimerState', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return timer state for existing session', async () => {
        // Create a test timer session
        const testSession = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 300, // 5 minutes
                remaining_seconds: 180, // 3 minutes remaining
                is_running: true,
                is_completed: false
            })
            .returning()
            .execute();

        const sessionId = testSession[0].id;
        const result = await getTimerState(sessionId);

        // Verify the timer state
        expect(result).not.toBeNull();
        expect(result!.id).toBe(sessionId);
        expect(result!.duration_seconds).toBe(300);
        expect(result!.remaining_seconds).toBe(180);
        expect(result!.is_running).toBe(true);
        expect(result!.is_completed).toBe(false);
        expect(result!.formatted_time).toBe('03:00'); // 180 seconds = 3:00
    });

    it('should return null for non-existent timer session', async () => {
        const result = await getTimerState(999);
        expect(result).toBeNull();
    });

    it('should format time correctly for different durations', async () => {
        // Test case 1: Less than 1 minute
        const session1 = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 60,
                remaining_seconds: 45, // 45 seconds
                is_running: false,
                is_completed: false
            })
            .returning()
            .execute();

        const result1 = await getTimerState(session1[0].id);
        expect(result1!.formatted_time).toBe('00:45');

        // Test case 2: Exactly 1 minute
        const session2 = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 120,
                remaining_seconds: 60, // 1 minute
                is_running: false,
                is_completed: false
            })
            .returning()
            .execute();

        const result2 = await getTimerState(session2[0].id);
        expect(result2!.formatted_time).toBe('01:00');

        // Test case 3: More than 10 minutes
        const session3 = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 900,
                remaining_seconds: 665, // 11 minutes and 5 seconds
                is_running: false,
                is_completed: false
            })
            .returning()
            .execute();

        const result3 = await getTimerState(session3[0].id);
        expect(result3!.formatted_time).toBe('11:05');
    });

    it('should handle completed timer session', async () => {
        // Create a completed timer session
        const completedSession = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 240,
                remaining_seconds: 0, // Timer completed
                is_running: false,
                is_completed: true
            })
            .returning()
            .execute();

        const result = await getTimerState(completedSession[0].id);

        expect(result).not.toBeNull();
        expect(result!.remaining_seconds).toBe(0);
        expect(result!.is_running).toBe(false);
        expect(result!.is_completed).toBe(true);
        expect(result!.formatted_time).toBe('00:00');
    });

    it('should handle timer with odd seconds correctly', async () => {
        // Test formatting with seconds that don't divide evenly
        const session = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 500,
                remaining_seconds: 127, // 2 minutes and 7 seconds
                is_running: true,
                is_completed: false
            })
            .returning()
            .execute();

        const result = await getTimerState(session[0].id);
        expect(result!.formatted_time).toBe('02:07');
        expect(result!.remaining_seconds).toBe(127);
    });

    it('should return correct state for paused timer', async () => {
        // Create a paused timer (not running, not completed, has remaining time)
        const pausedSession = await db.insert(timerSessionsTable)
            .values({
                duration_seconds: 600, // 10 minutes
                remaining_seconds: 420, // 7 minutes remaining
                is_running: false, // Paused
                is_completed: false
            })
            .returning()
            .execute();

        const result = await getTimerState(pausedSession[0].id);

        expect(result).not.toBeNull();
        expect(result!.duration_seconds).toBe(600);
        expect(result!.remaining_seconds).toBe(420);
        expect(result!.is_running).toBe(false);
        expect(result!.is_completed).toBe(false);
        expect(result!.formatted_time).toBe('07:00');
    });
});