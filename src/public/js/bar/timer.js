export function createTimer(params, callbacks) {
  let currentValue = params.start;

  const setCurrentValue = (value) => {
    params.start = value;
    currentValue = value;
    callbacks.onProgressChange(value);
  };

  if (!params.positionMode) {
    const isCountdown = params.direction === "countdown";
    const interval = setInterval(() => {
      const done = isCountdown ? currentValue <= 0 : currentValue >= params.max;
      if (done) {
        clearInterval(interval);
        return;
      }
      currentValue += isCountdown ? -1 : 1;
      callbacks.onProgressChange(currentValue);
    }, 1000);
  }

  return { getCurrentValue: () => currentValue, setCurrentValue };
}
