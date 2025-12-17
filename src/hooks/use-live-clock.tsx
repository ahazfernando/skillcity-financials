import { useState, useEffect } from "react";

interface ClockTime {
  time: string;
  date: string;
  dayOfWeek: string;
}

export const useLiveClock = (): ClockTime => {
  const [clockTime, setClockTime] = useState<ClockTime>(() => {
    const now = new Date();
    return {
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
      dayOfWeek: now.toLocaleDateString([], { weekday: 'long' }),
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClockTime({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
        dayOfWeek: now.toLocaleDateString([], { weekday: 'long' }),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return clockTime;
};






