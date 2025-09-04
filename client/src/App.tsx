import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';
// Using type-only import for better TypeScript compliance
import type { TimerSession, TimerState } from '../../server/src/schema';

function App() {
  const [currentTimer, setCurrentTimer] = useState<TimerSession | null>(null);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  // Audio context for alarm sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio context
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current && isSoundEnabled) {
      try {
        // Type assertion for WebKit browsers
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [isSoundEnabled]);

  // Generate alarm beep sound using Web Audio API
  const playAlarmSound = useCallback(async () => {
    if (!isSoundEnabled || !audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Create oscillator for beep sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Configure beep sound: 800Hz tone
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = 'sine';

      // Configure volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      // Play for 500ms
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      // Play multiple beeps
      setTimeout(() => {
        if (timerState?.is_completed && timerState?.remaining_seconds === 0) {
          playAlarmSound();
        }
      }, 800);
    } catch (error) {
      console.warn('Failed to play alarm sound:', error);
    }
  }, [isSoundEnabled, timerState?.is_completed, timerState?.remaining_seconds]);

  // Create a new timer session on app start
  const createNewTimer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const timer = await trpc.createTimerSession.mutate({
        duration_seconds: 240 // 4 minutes
      });
      setCurrentTimer(timer);
      
      // Get initial state
      const state = await trpc.getTimerState.query({ id: timer.id });
      setTimerState(state);
    } catch (error) {
      console.error('Failed to create timer:', error);
      // Fallback to client-side timer when backend is not available
      const fallbackTimer: TimerSession = {
        id: 1,
        duration_seconds: 240,
        remaining_seconds: 240,
        is_running: false,
        is_completed: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      const fallbackState: TimerState = {
        id: 1,
        duration_seconds: 240,
        remaining_seconds: 240,
        is_running: false,
        is_completed: false,
        formatted_time: '04:00'
      };
      setCurrentTimer(fallbackTimer);
      setTimerState(fallbackState);
      setError('⚠️ Backend unavailable - using client-side timer demo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch timer state
  const fetchTimerState = useCallback(async () => {
    if (!currentTimer) return;
    
    try {
      const state = await trpc.getTimerState.query({ id: currentTimer.id });
      setTimerState(state);
      
      // Check if timer completed and play alarm
      if (state?.is_completed && state.remaining_seconds === 0 && isSoundEnabled) {
        playAlarmSound();
      }
    } catch (error) {
      console.error('Failed to fetch timer state:', error);
      // Fallback: update client-side timer when backend unavailable
      if (timerState?.is_running && !timerState.is_completed) {
        const newRemaining = Math.max(0, timerState.remaining_seconds - 1);
        const isCompleted = newRemaining === 0;
        
        const formatTime = (seconds: number): string => {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };
        
        const updatedState: TimerState = {
          ...timerState,
          remaining_seconds: newRemaining,
          is_completed: isCompleted,
          is_running: !isCompleted,
          formatted_time: formatTime(newRemaining)
        };
        
        setTimerState(updatedState);
        
        // Play alarm when completed
        if (isCompleted && isSoundEnabled) {
          playAlarmSound();
        }
      }
    }
  }, [currentTimer, isSoundEnabled, playAlarmSound, timerState]);

  // Start timer
  const handleStart = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await trpc.startTimer.mutate({ id: currentTimer.id });
      await fetchTimerState();
    } catch (error) {
      console.error('Failed to start timer:', error);
      // Fallback: start client-side timer
      if (timerState) {
        setTimerState({ ...timerState, is_running: true });
      }
      setError('⚠️ Backend unavailable - using client-side timer demo');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop timer
  const handleStop = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await trpc.stopTimer.mutate({ id: currentTimer.id });
      await fetchTimerState();
    } catch (error) {
      console.error('Failed to stop timer:', error);
      // Fallback: stop client-side timer
      if (timerState) {
        setTimerState({ ...timerState, is_running: false });
      }
      setError('⚠️ Backend unavailable - using client-side timer demo');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset timer
  const handleReset = async () => {
    if (!currentTimer) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await trpc.resetTimer.mutate({ id: currentTimer.id });
      await fetchTimerState();
    } catch (error) {
      console.error('Failed to reset timer:', error);
      // Fallback: reset client-side timer
      if (timerState) {
        setTimerState({
          ...timerState,
          remaining_seconds: 240,
          is_running: false,
          is_completed: false,
          formatted_time: '04:00'
        });
      }
      setError('⚠️ Backend unavailable - using client-side timer demo');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle sound
  const toggleSound = () => {
    setIsSoundEnabled(!isSoundEnabled);
  };

  // Update timer state every second when running
  useEffect(() => {
    if (timerState?.is_running && !timerState.is_completed) {
      intervalRef.current = setInterval(() => {
        fetchTimerState();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState?.is_running, timerState?.is_completed, fetchTimerState]);

  // Initialize timer on app start
  useEffect(() => {
    createNewTimer();
    initializeAudio();
  }, [createNewTimer, initializeAudio]);

  // Handle user interaction to enable audio (required by browsers)
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [initializeAudio]);

  if (isLoading && !currentTimer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Timer className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">Initializing timer...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = () => {
    if (timerState?.is_completed) return 'bg-red-500';
    if (timerState?.is_running) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (timerState?.is_completed) return 'COMPLETED! ⏰';
    if (timerState?.is_running) return 'RUNNING';
    return 'PAUSED';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className="w-6 h-6 text-indigo-600" />
              <CardTitle className="text-2xl font-bold text-gray-800">
                4-Minute Timer ⏱️
              </CardTitle>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <Badge variant={timerState?.is_completed ? 'destructive' : timerState?.is_running ? 'default' : 'secondary'}>
                {getStatusText()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="text-center space-y-6">
            {error && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Timer Display */}
            <div className="relative">
              <div className={`text-8xl font-mono font-bold text-center transition-colors duration-300 ${
                timerState?.is_completed 
                  ? 'text-red-600 animate-pulse' 
                  : timerState?.is_running 
                    ? 'text-green-600' 
                    : 'text-gray-700'
              }`}>
                {timerState?.formatted_time || '04:00'}
              </div>
              {timerState?.is_completed && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="text-4xl animate-bounce">🔔</span>
                </div>
              )}
            </div>

            {/* Progress visualization */}
            {timerState && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    timerState.is_completed ? 'bg-red-500' : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${((timerState.duration_seconds - timerState.remaining_seconds) / timerState.duration_seconds) * 100}%`
                  }}
                />
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center gap-3">
              {!timerState?.is_running && !timerState?.is_completed && (
                <Button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
              )}

              {timerState?.is_running && !timerState?.is_completed && (
                <Button
                  onClick={handleStop}
                  disabled={isLoading}
                  variant="destructive"
                  className="px-6"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}

              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="outline"
                className="px-6"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              <Button
                onClick={toggleSound}
                variant="outline"
                size="icon"
                className={`${isSoundEnabled ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>🎵 Sound will play when timer completes</p>
              <p>📱 Works best when screen stays active</p>
              {timerState?.is_completed && (
                <p className="text-red-600 font-semibold animate-pulse">
                  ⏰ Time's up! Timer completed!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;