'use client';

import { useLayoutEffect, useRef } from 'react';
import { videoPlaybackSrc } from '@/lib/video/playback-src';
import { bindPlyrRussianSpeedUi, type PlyrRussianUiHost } from '@/lib/video/plyr-ru-speed-ui';
import { loadPlyr } from '@/lib/video/load-plyr';

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  title?: string;
}

type PlyrInstance = PlyrRussianUiHost & { destroy(): void };

/** У Chromium поле message у MediaError часто пустое — не полагаться на него в логах */
const MEDIA_ERR_LABEL: Record<number, string> = {
  1: 'MEDIA_ERR_ABORTED (прервано)',
  2: 'MEDIA_ERR_NETWORK (сеть / доступ к файлу)',
  3: 'MEDIA_ERR_DECODE (не удалось декодировать)',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED (кодек/формат не поддерживается браузером)',
};

export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<PlyrInstance | null>(null);
  const teardownRef = useRef(false);

  useLayoutEffect(() => {
    teardownRef.current = false;

    const trimmed = src?.trim();
    if (!trimmed || typeof window === 'undefined') return;

    const playback = videoPlaybackSrc(trimmed);

    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;

    const destroy = () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* уже уничтожен */
        }
        playerRef.current = null;
      }
    };

    destroy();
    videoEl.removeAttribute('controls');

    const onVideoError = () => {
      if (teardownRef.current) return;
      const err = videoEl.error;
      if (!err) return;

      const label = MEDIA_ERR_LABEL[err.code] ?? `неизвестный код ${err.code}`;
      const msg = err.message?.trim();
      console.error(
        `[VideoPlayer] ${label}${msg ? ` — ${msg}` : ''}\n` +
          `  originalSrc: ${trimmed}\n` +
          `  playbackSrc: ${playback}\n` +
          `  currentSrc: ${videoEl.currentSrc || '(пусто)'}\n` +
          `  networkState: ${videoEl.networkState} readyState: ${videoEl.readyState}`
      );
    };

    videoEl.addEventListener('error', onVideoError);

    const plyrOptions = {
      controls: [
        'play-large',
        'restart',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'settings',
        'pip',
        'airplay',
        'fullscreen',
      ],
      settings: ['speed'],
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      },
      keyboard: {
        focused: true,
        global: false,
      },
      tooltips: {
        controls: true,
        seek: true,
      },
      i18n: {
        restart: 'Перезапустить',
        rewind: 'Перемотать назад',
        play: 'Воспроизвести',
        pause: 'Пауза',
        fastForward: 'Перемотать вперед',
        seek: 'Перейти',
        seekLabel: '{currentTime} из {duration}',
        played: 'Воспроизведено',
        buffered: 'Буферизовано',
        currentTime: 'Текущее время',
        duration: 'Длительность',
        volume: 'Громкость',
        mute: 'Отключить звук',
        unmute: 'Включить звук',
        enableCaptions: 'Включить субтитры',
        disableCaptions: 'Выключить субтитры',
        download: 'Скачать',
        enterFullscreen: 'Полноэкранный режим',
        exitFullscreen: 'Выйти из полноэкранного режима',
        frameTitle: 'Плеер для {title}',
        captions: 'Субтитры',
        settings: 'Настройки',
        speed: 'Скорость',
        normal: 'Обычная',
        menuBack: 'Назад к предыдущему меню',
        pip: 'Картинка в картинке',
        menu: 'Меню',
        quality: 'Качество',
        loop: 'Зациклить',
        start: 'Начать',
        end: 'Конец',
        all: 'Все',
        reset: 'Сбросить',
        disabled: 'Отключено',
        enabled: 'Включено',
        advertisement: 'Реклама',
        qualityBadge: {
          2160: '4K',
          1440: 'HD',
          1080: 'HD',
          720: 'HD',
          576: 'SD',
          480: 'SD',
        },
      },
    };

    void loadPlyr()
      .then((PlyrCtor) => {
        if (cancelled || videoRef.current !== videoEl) return;
        try {
          destroy();
          const instance = new PlyrCtor(videoEl, plyrOptions) as unknown as PlyrInstance;
          playerRef.current = instance;
          bindPlyrRussianSpeedUi(instance);
        } catch (e) {
          console.error('[VideoPlayer] Plyr init failed', e);
          videoEl.setAttribute('controls', '');
        }
      })
      .catch((e) => {
        console.error('[VideoPlayer] не удалось загрузить Plyr', e);
        if (!cancelled) videoEl.setAttribute('controls', '');
      });

    return () => {
      cancelled = true;
      teardownRef.current = true;
      videoEl.removeEventListener('error', onVideoError);
      destroy();
      videoEl.removeAttribute('controls');
    };
  }, [src]);

  const safeSrc = src?.trim() ?? '';
  if (!safeSrc) return null;

  const playback = videoPlaybackSrc(safeSrc);
  const mimeHint =
    /\.webm(\?|$)/i.test(safeSrc) || /\.webm(\?|$)/i.test(playback)
      ? 'video/webm'
      : 'video/mp4';

  return (
    <div key={`${safeSrc}-${playback}`} className="plyr-container relative w-full aspect-video min-h-[200px] bg-black">
      <video
        ref={videoRef}
        className="plyr h-full w-full"
        playsInline
        preload="auto"
        {...(title ? { 'aria-label': title } : {})}
      >
        <source src={playback} type={mimeHint} />
      </video>
    </div>
  );
}
