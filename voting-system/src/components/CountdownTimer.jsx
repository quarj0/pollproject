import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

const CountdownTimer = ({ startTime, endTime }) => {
  const [status, setStatus] = useState('waiting'); // 'waiting', 'ongoing', 'ended'
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (now >= end) {
        clearInterval(timer);
        setStatus('ended');
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      if (now >= start) {
        setStatus('ongoing');
        return;
      }

      // Calculate time until start
      const days = differenceInDays(start, now);
      const hours = differenceInHours(start, now) % 24;
      const minutes = differenceInMinutes(start, now) % 60;
      const seconds = differenceInSeconds(start, now) % 60;

      setTimeLeft({ days, hours, minutes, seconds });
      setStatus('waiting');
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, endTime]);

  const TimeUnit = ({ value, unit }) => (
    <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2">
      <span className="text-lg font-bold text-gray-800">{value}</span>
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  );

  if (status === 'ongoing') {
    return (
      <div className="inline-flex items-center">
        <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-full flex items-center">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-[pulse_1.5s_ease-in-out_infinite]"></span>
          Live
        </span>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="inline-flex items-center">
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
          Ended
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 my-3">
      <p className="text-sm text-gray-500 mb-1">Starts in:</p>
      <div className="flex justify-center gap-2">
        <TimeUnit value={timeLeft.days} unit="days" />
        <TimeUnit value={timeLeft.hours} unit="hrs" />
        <TimeUnit value={timeLeft.minutes} unit="min" />
        <TimeUnit value={timeLeft.seconds} unit="sec" />
      </div>
    </div>
  );
};

export default CountdownTimer; 