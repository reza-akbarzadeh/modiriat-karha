let audioCtx: AudioContext | null = null;
let alarmIntervalId: any = null;

/**
 * Initializes the AudioContext if not already done.
 * Must be called as a result of user interaction (e.g. click) to avoid browser block,
 * but browsers usually allow playback when triggered by timers if initialized properly.
 */
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a notification chime.
 */
export function playChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual oscillator chime (warm sound)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.3); // E6

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (error) {
    console.error('Failed to play chime:', error);
  }
}

/**
 * Starts a looping beep sequence.
 */
export function startAlarmLoop() {
  if (alarmIntervalId) return;

  // Initial play
  playChime();

  // Play every 1.5 seconds
  alarmIntervalId = setInterval(() => {
    playChime();
  }, 1500);
}

/**
 * Stops the looping beep sequence.
 */
export function stopAlarmLoop() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}
