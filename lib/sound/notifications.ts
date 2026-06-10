let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 250;
const SOUND_PREF_KEY = 'tt_sound_enabled';

export type SoundKind = 'notification' | 'message' | 'comment' | 'sent' | 'achievement';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(SOUND_PREF_KEY);
  if (raw === null) return true;
  return raw === '1';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0');
}

type ToneStep = { freq: number; at: number; duration: number; gain: number };

function playToneSteps(steps: ToneStep[]) {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }

  const t0 = audioCtx.currentTime;
  let latestEnd = t0;

  for (const step of steps) {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = step.freq;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    const start = t0 + step.at;
    const end = start + step.duration;
    latestEnd = Math.max(latestEnd, end);
    gain.gain.exponentialRampToValueAtTime(step.gain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  window.setTimeout(() => {
    void audioCtx.close();
  }, Math.ceil((latestEnd - t0) * 1000) + 80);
}

const SOUND_PRESETS: Record<SoundKind, ToneStep[]> = {
  notification: [{ freq: 640, at: 0, duration: 0.16, gain: 0.05 }],
  message: [{ freq: 780, at: 0, duration: 0.16, gain: 0.05 }],
  sent: [{ freq: 520, at: 0, duration: 0.09, gain: 0.035 }],
  comment: [
    { freq: 587, at: 0, duration: 0.08, gain: 0.04 },
    { freq: 740, at: 0.1, duration: 0.1, gain: 0.04 },
  ],
  achievement: [{ freq: 880, at: 0, duration: 0.12, gain: 0.06 }],
};

export function playNotificationSound(kind: SoundKind = 'notification') {
  if (typeof window === 'undefined' || !isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  try {
    playToneSteps(SOUND_PRESETS[kind] ?? SOUND_PRESETS.notification);
  } catch {
    // silent fallback
  }
}

export function playSendSound() {
  playNotificationSound('sent');
}

export function playCommentSound() {
  playNotificationSound('comment');
}
