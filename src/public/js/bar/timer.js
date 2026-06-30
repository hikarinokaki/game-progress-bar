export function createTimer(params, callbacks) {
  let currentValue = params.start;
  let intervalId = null;
  let paused = params.paused === true;

  const tick = () => {
    const isCountdown = params.direction === "countdown";
    const done = isCountdown ? currentValue <= 0 : currentValue >= params.max;
    if (done) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }
    currentValue += isCountdown ? -1 : 1;
    callbacks.onProgressChange(currentValue);
  };

  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(tick, 1000);
  };

  const setCurrentValue = (value) => {
    params.start = value;
    currentValue = value;
    callbacks.onProgressChange(value);
  };

  const pause = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    paused = true;
  };

  const resume = () => {
    paused = false;
    startInterval();
  };

  const isPaused = () => paused;

  if (!params.paused) {
    startInterval();
  }

  return {
    getCurrentValue: () => currentValue,
    setCurrentValue,
    pause,
    resume,
    isPaused,
  };
}
