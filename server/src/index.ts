import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createTimerSessionInputSchema, 
  updateTimerSessionInputSchema 
} from './schema';

// Import handlers
import { createTimerSession } from './handlers/create_timer_session';
import { getTimerSession } from './handlers/get_timer_session';
import { updateTimerSession } from './handlers/update_timer_session';
import { startTimer } from './handlers/start_timer';
import { stopTimer } from './handlers/stop_timer';
import { resetTimer } from './handlers/reset_timer';
import { getTimerState } from './handlers/get_timer_state';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Create a new timer session
  createTimerSession: publicProcedure
    .input(createTimerSessionInputSchema)
    .mutation(({ input }) => createTimerSession(input)),

  // Get timer session by ID
  getTimerSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTimerSession(input.id)),

  // Update timer session
  updateTimerSession: publicProcedure
    .input(updateTimerSessionInputSchema)
    .mutation(({ input }) => updateTimerSession(input)),

  // Start timer
  startTimer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => startTimer(input.id)),

  // Stop timer
  stopTimer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => stopTimer(input.id)),

  // Reset timer
  resetTimer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => resetTimer(input.id)),

  // Get timer state with formatted time
  getTimerState: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTimerState(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();