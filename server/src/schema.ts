import { z } from 'zod';

// Timer session schema
export const timerSessionSchema = z.object({
  id: z.number(),
  duration_seconds: z.number().int().positive(), // Duration in seconds
  remaining_seconds: z.number().int().nonnegative(), // Remaining time in seconds
  is_running: z.boolean(),
  is_completed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TimerSession = z.infer<typeof timerSessionSchema>;

// Input schema for creating a timer session
export const createTimerSessionInputSchema = z.object({
  duration_seconds: z.number().int().positive().default(240) // Default to 4 minutes (240 seconds)
});

export type CreateTimerSessionInput = z.infer<typeof createTimerSessionInputSchema>;

// Input schema for updating timer session
export const updateTimerSessionInputSchema = z.object({
  id: z.number(),
  remaining_seconds: z.number().int().nonnegative().optional(),
  is_running: z.boolean().optional(),
  is_completed: z.boolean().optional()
});

export type UpdateTimerSessionInput = z.infer<typeof updateTimerSessionInputSchema>;

// Timer state response schema
export const timerStateSchema = z.object({
  id: z.number(),
  duration_seconds: z.number(),
  remaining_seconds: z.number(),
  is_running: z.boolean(),
  is_completed: z.boolean(),
  formatted_time: z.string() // MM:SS format
});

export type TimerState = z.infer<typeof timerStateSchema>;