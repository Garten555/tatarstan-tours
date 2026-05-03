let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 250;
const SOUND_PREF_KEY = 'tt_sound_enabled';

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

export function playNotificationSound(kind: 'notification' | 'message' = 'notification') {
  if (typeof window === 'undefined' || !isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = now;

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'message' ? 780 : 640;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    oscillator.start(t);
    oscillator.stop(t + 0.17);
    oscillator.onended = () => {
      void audioCtx.close();
    };
  } catch {
    // silent fallback
  }
}

