import { serial, pgTable, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const timerSessionsTable = pgTable('timer_sessions', {
  id: serial('id').primaryKey(),
  duration_seconds: integer('duration_seconds').notNull(), // Total duration in seconds
  remaining_seconds: integer('remaining_seconds').notNull(), // Remaining time in seconds
  is_running: boolean('is_running').notNull().default(false), // Whether timer is currently running
  is_completed: boolean('is_completed').notNull().default(false), // Whether timer has reached zero
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// TypeScript type for the table schema
export type TimerSession = typeof timerSessionsTable.$inferSelect; // For SELECT operations
export type NewTimerSession = typeof timerSessionsTable.$inferInsert; // For INSERT operations

// Export all tables for proper query building
export const tables = { timerSessions: timerSessionsTable };