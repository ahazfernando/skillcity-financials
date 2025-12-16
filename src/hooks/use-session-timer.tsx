import { useState, useEffect, useRef } from "react";

interface SessionTimerResult {
  elapsedTime: string; // HH:MM:SS format
  elapsedSeconds: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export const useSessionTimer = (startTime?: string): SessionTimerResult => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string | null>(startTime || null);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate initial elapsed time if startTime is provided
  useEffect(() => {
    if (startTime && !isRunning && !startTimeRef.current) {
      const start = new Date(startTime);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
      if (diffSeconds > 0) {
        setElapsedSeconds(diffSeconds);
        setIsRunning(true);
        startTimeRef.current = startTime;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
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
  }, [isRunning]);

  const start = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = new Date().toISOString();
    }
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setElapsedSeconds(0);
    setIsRunning(false);
    startTimeRef.current = null;
  };

  return {
    elapsedTime: formatTime(elapsedSeconds),
    elapsedSeconds,
    isRunning,
    start,
    stop,
    reset,
  };
};

